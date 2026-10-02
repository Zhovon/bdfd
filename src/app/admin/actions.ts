"use server";

import { revalidatePath } from "next/cache";
import {
  getUserById,
  setUserStatus,
  setUserRole,
  deleteUser,
  isDbId,
  parseId,
  type UserRole,
  type UserStatus,
} from "@/lib/db";
import {
  createPost,
  getPost,
  updatePost,
  deletePost,
  createPoll,
  closePoll,
  reopenPoll,
  deletePoll,
  type PostCategory,
  type PaymentMode,
} from "@/lib/content";
import { getDonation, setDonationStatus, updatePaymentMethod, type DonationStatus } from "@/lib/payments";
import { requireAdmin, requireStaff } from "@/lib/session";
import { sendMail } from "@/lib/mailer";
import { buildEmail } from "@/lib/messages";
import { saveUploads, savePdf, deleteUploads, UploadError } from "@/lib/uploads";
import { getDict } from "@/lib/i18n";
import { notifyUser, notifyApprovedMembers } from "@/lib/notifications";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** Largest fee the NUMERIC(12,2) column holds comfortably. */
const MAX_AMOUNT = 1_000_000_000;
/** Upper bound on sections per post, whatever the form claims. */
const MAX_BLOCKS = 50;

/* ------------------------------ Membership ------------------------------ */

async function changeStatus(rawId: FormDataEntryValue | null, status: UserStatus) {
  const admin = await requireAdmin();
  const id = parseId(rawId);
  const user = id ? await getUserById(id) : null;
  // Admin accounts (including your own) can't be blocked or rejected from here.
  if (!user || user.id === admin.id || (user.role === "admin" && status !== "approved")) return;
  if (user.status === status) return;
  const firstApproval = user.approved_at === null;
  await setUserStatus(user.id, status);
  // The welcome email/notification is for a first approval — not for unblocking.
  if (status === "approved" && firstApproval) {
    const { subject, text } = buildEmail({ kind: "approved", name: user.full_name });
    await sendMail(user.email, subject, text);
    await notifyUser(user.id, { kind: "accountApproved" }, "/portal");
  } else if (status === "rejected" && firstApproval) {
    const { subject, text } = buildEmail({ kind: "rejected", name: user.full_name });
    await sendMail(user.email, subject, text);
  }
  revalidatePath("/admin");
}

export async function approveUser(formData: FormData) {
  await changeStatus(formData.get("id"), "approved");
}
export async function rejectUser(formData: FormData) {
  await changeStatus(formData.get("id"), "rejected");
}
export async function blockUser(formData: FormData) {
  await changeStatus(formData.get("id"), "blocked");
}
export async function unblockUser(formData: FormData) {
  await changeStatus(formData.get("id"), "approved");
}

export async function setRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseId(formData.get("id"));
  const role = str(formData.get("role")) as UserRole;
  // Changing your own role could lock the last admin out of the panel.
  if (id && id !== admin.id && ["member", "moderator", "admin"].includes(role)) {
    await setUserRole(id, role);
    revalidatePath("/admin");
  }
}

export async function removeUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseId(formData.get("id"));
  if (!id || id === admin.id) return;
  await deleteUser(id);
  revalidatePath("/admin");
}

/* -------------------------------- Content ------------------------------- */

export type PostFormState = { ok: boolean; message: string } | null;

export async function addPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const staff = await requireStaff();
  const m = (await getDict()).msg;
  const category = str(formData.get("category")) as PostCategory;
  const title = str(formData.get("title"));
  const excerpt = str(formData.get("excerpt"));
  if (!["travel", "welfare", "condolence", "association", "transfer", "portal_info"].includes(category))
    return { ok: false, message: m.chooseBoard };
  if (!title) return { ok: false, message: m.giveTitle };

  // Payment intent — only Travel & Tourism posts may carry a payment.
  const paymentMode = (category === "travel"
    ? str(formData.get("paymentMode")) || "none"
    : "none") as PaymentMode;
  if (!["none", "participation", "donation"].includes(paymentMode))
    return { ok: false, message: m.invalidMode };
  let feeAmount: number | null = null;
  if (paymentMode === "participation") {
    feeAmount = Number(str(formData.get("feeAmount")));
    if (!Number.isFinite(feeAmount) || feeAmount <= 0 || feeAmount > MAX_AMOUNT)
      return { ok: false, message: m.feeRequired };
  }

  const stamp = Date.now();
  // Optional programme PDF, rendered after the body. Saved first: it's the one
  // upload that can reject the form, so nothing else is stored if it does.
  let pdfUrl: string | null = null;
  try {
    pdfUrl = await savePdf(formData.get("pdf"), `post-${stamp}-doc`);
  } catch (err) {
    return { ok: false, message: err instanceof UploadError ? m[err.code] : m.pdfFailed };
  }

  // Cover photos (the first is the main image; all appear in the gallery).
  const cover = await saveUploads(formData.getAll("cover"), `post-${stamp}-cover`);

  // Video links — one per line, keep only http(s) URLs.
  const videos = str(formData.get("videos"))
    .split("\n")
    .map((v) => v.trim())
    .filter((v) => /^https?:\/\//i.test(v));
    
  const priority = Number(str(formData.get("priority"))) || 0;

  // Repeatable sections: block-heading-i / block-body-i / block-images-i.
  const blockCount = Math.min(Number(str(formData.get("blockCount"))) || 0, MAX_BLOCKS);
  const blocks: { heading: string; body: string; images: string[] }[] = [];
  for (let i = 0; i < blockCount; i++) {
    const heading = str(formData.get(`block-heading-${i}`));
    const body = str(formData.get(`block-body-${i}`));
    const images = await saveUploads(formData.getAll(`block-images-${i}`), `post-${stamp}-b${i}`);
    if (!heading && !body && images.length === 0) continue; // skip empty section
    blocks.push({ heading, body, images });
  }

  try {
    await createPost({ category, title, excerpt, authorId: staff.id, cover, blocks, videos, pdfUrl, paymentMode, feeAmount, priority });
  } catch (err) {
    // Nothing was saved, so don't leave the uploaded files behind.
    await deleteUploads([pdfUrl, ...cover, ...blocks.flatMap((b) => b.images)]);
    console.error("addPost failed:", err);
    return { ok: false, message: m.publishFailed };
  }

  await notifyApprovedMembers(
    { kind: "newNotice", board: category, noticeTitle: title },
    `/portal/${category}`,
    staff.id,
  );
  revalidatePath("/admin/content");
  revalidatePath(`/portal/${category}`);
  return { ok: true, message: m.published };
}

export async function editPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  await requireStaff();
  const m = (await getDict()).msg;
  const id = parseId(formData.get("id"));
  if (!id || !(await getPost(id))) return { ok: false, message: m.unknownPost };

  const category = str(formData.get("category")) as PostCategory;
  const title = str(formData.get("title"));
  const excerpt = str(formData.get("excerpt"));
  if (!["travel", "welfare", "condolence", "association", "transfer", "portal_info"].includes(category))
    return { ok: false, message: m.chooseBoard };
  if (!title) return { ok: false, message: m.giveTitle };

  const paymentMode = (category === "travel"
    ? str(formData.get("paymentMode")) || "none"
    : "none") as PaymentMode;
  if (!["none", "participation", "donation"].includes(paymentMode))
    return { ok: false, message: m.invalidMode };
  let feeAmount: number | null = null;
  if (paymentMode === "participation") {
    feeAmount = Number(str(formData.get("feeAmount")));
    if (!Number.isFinite(feeAmount) || feeAmount <= 0 || feeAmount > MAX_AMOUNT)
      return { ok: false, message: m.feeRequired };
  }

  const stamp = Date.now();

  const videos = str(formData.get("videos"))
    .split("\n")
    .map((v) => v.trim())
    .filter((v) => /^https?:\/\//i.test(v));

  const priority = Number(str(formData.get("priority"))) || 0;

  const removeImageIds = formData
    .getAll("removeImage")
    .map((v) => Number(v))
    .filter(isDbId);
  const removePdf = formData.get("removePdf") === "on";
  let newPdfUrl: string | null = null;
  try {
    newPdfUrl = await savePdf(formData.get("pdf"), `post-${id}-${stamp}-doc`);
  } catch (err) {
    return { ok: false, message: err instanceof UploadError ? m[err.code] : m.pdfFailed };
  }
  const newCover = await saveUploads(formData.getAll("cover"), `post-${id}-${stamp}`);
  const coverOrder = str(formData.get("coverOrder")).split(",").map(Number).filter(isDbId);

  const blockCount = Math.min(Number(str(formData.get("blockCount"))) || 0, MAX_BLOCKS);
  const blocks: { id: number | null; heading: string; body: string; newImages: string[]; imageOrder: number[] }[] = [];
  for (let i = 0; i < blockCount; i++) {
    const blockId = parseId(formData.get(`block-id-${i}`));
    const heading = str(formData.get(`block-heading-${i}`));
    const body = str(formData.get(`block-body-${i}`));
    const newImages = await saveUploads(formData.getAll(`block-images-${i}`), `post-${id}-${stamp}-b${i}`);
    const imageOrder = str(formData.get(`block-images-order-${i}`)).split(",").map(Number).filter(isDbId);
    
    // Drop only brand-new sections left completely empty; keep existing ones so
    // the user can clear text yet retain the section's photos.
    if (blockId === null && !heading && !body && newImages.length === 0) continue;
    blocks.push({ id: blockId, heading, body, newImages, imageOrder });
  }

  let dropped: string[];
  try {
    dropped = await updatePost(id, {
      category,
      title,
      excerpt,
      newCover,
      coverOrder,
      removeImageIds,
      blocks,
      videos,
      newPdfUrl,
      removePdf,
      paymentMode,
      feeAmount,
      priority,
    });
  } catch (err) {
    // The edit rolled back, so the files uploaded for it are unused.
    await deleteUploads([newPdfUrl, ...newCover, ...blocks.flatMap((b) => b.newImages)]);
    console.error("editPost failed:", err);
    return { ok: false, message: m.saveFailed };
  }
  // Files the edit removed (ticked photos, dropped sections, a replaced PDF).
  await deleteUploads(dropped);

  revalidatePath("/admin/content");
  revalidatePath(`/portal/${category}`);
  revalidatePath(`/portal/notice/${id}`);
  return { ok: true, message: m.saved };
}

export async function removePost(formData: FormData) {
  await requireStaff();
  const id = parseId(formData.get("id"));
  if (id) await deleteUploads(await deletePost(id));
  revalidatePath("/admin/content");
}

/* --------------------------------- Polls -------------------------------- */

export async function addPoll(formData: FormData) {
  await requireStaff();
  const question = str(formData.get("question"));
  const options = str(formData.get("options"))
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  if (!question || options.length < 2) return;
  await createPoll(question, options);
  revalidatePath("/admin/polls");
}

export async function closePollAction(formData: FormData) {
  await requireStaff();
  const id = parseId(formData.get("id"));
  if (id) await closePoll(id);
  revalidatePath("/admin/polls");
}

export async function reopenPollAction(formData: FormData) {
  await requireStaff();
  const id = parseId(formData.get("id"));
  if (id) await reopenPoll(id);
  revalidatePath("/admin/polls");
}

export async function deletePollAction(formData: FormData) {
  await requireStaff();
  const id = parseId(formData.get("id"));
  if (id) await deletePoll(id);
  revalidatePath("/admin/polls");
}

/* ------------------------------- Donations ------------------------------ */

async function setDonation(rawId: FormDataEntryValue | null, status: DonationStatus) {
  await requireStaff();
  const id = parseId(rawId);
  const donation = id ? await getDonation(id) : null;
  if (!donation) return;
  // Only a still-'reported' row changes, and only then is the member notified.
  const changed = await setDonationStatus(donation.id, status);
  if (changed && donation.user_id) {
    const link = donation.post_id ? `/portal/notice/${donation.post_id}` : "/portal/welfare";
    await notifyUser(
      donation.user_id,
      {
        kind: status === "verified" ? "paymentConfirmed" : "paymentRejected",
        amount: Number(donation.amount),
        tour: donation.kind === "participation",
      },
      link,
    );
  }
  revalidatePath("/admin/donations");
}
export async function verifyDonation(formData: FormData) {
  await setDonation(formData.get("id"), "verified");
}
export async function rejectDonation(formData: FormData) {
  await setDonation(formData.get("id"), "rejected");
}

/* ------------------------------- Payments ------------------------------- */

export async function savePaymentMethod(formData: FormData) {
  await requireAdmin();
  const id = parseId(formData.get("id"));
  const label = str(formData.get("label"));
  const accountName = str(formData.get("account_name"));
  const accountNumber = str(formData.get("account_number"));
  // Members pay to whatever is shown here — never save a blank account.
  if (!id || !label || !accountName || !accountNumber) return;
  await updatePaymentMethod(id, {
    label,
    account_name: accountName,
    account_number: accountNumber,
    instructions: str(formData.get("instructions")),
    active: formData.get("active") === "on",
  });
  revalidatePath("/admin/payments");
}

/* ------------------------------- Tickers -------------------------------- */

export async function createTicker(formData: FormData): Promise<void> {
  await requireAdmin();
  const message = str(formData.get("message"));
  let link = str(formData.get("link")) || null;
  const postId = str(formData.get("post_id"));
  
  if (postId) {
    link = `/portal/notice/${postId}`;
  }

  if (!message) return;
  const { pool, ensureSchema } = await import("@/lib/db");
  await ensureSchema();
  await pool.query(`INSERT INTO tickers (message, link) VALUES ($1, $2)`, [message, link]);
  revalidatePath("/admin/tickers");
  revalidatePath("/portal");
}

export async function toggleTicker(id: number, active: boolean): Promise<void> {
  await requireAdmin();
  const { pool, ensureSchema } = await import("@/lib/db");
  await ensureSchema();
  await pool.query(`UPDATE tickers SET active = $2 WHERE id = $1`, [id, active]);
  revalidatePath("/admin/tickers");
  revalidatePath("/portal");
}

export async function removeTicker(id: number): Promise<void> {
  await requireAdmin();
  const { pool, ensureSchema } = await import("@/lib/db");
  await ensureSchema();
  await pool.query(`DELETE FROM tickers WHERE id = $1`, [id]);
  revalidatePath("/admin/tickers");
  revalidatePath("/portal");
}
