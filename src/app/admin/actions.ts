"use server";

import { revalidatePath } from "next/cache";
import {
  getUserById,
  setUserStatus,
  setUserRole,
  deleteUser,
  type UserRole,
  type UserStatus,
} from "@/lib/db";
import {
  createPost,
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
import { approvalEmail, rejectionEmail, sendMail } from "@/lib/mailer";
import { saveUploads } from "@/lib/uploads";
import { notifyUser, notifyApprovedMembers } from "@/lib/notifications";
import { getModule } from "@/lib/site";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/* ------------------------------ Membership ------------------------------ */

async function changeStatus(id: number, status: UserStatus) {
  await requireAdmin();
  const user = await getUserById(id);
  if (!user) return;
  await setUserStatus(id, status);
  if (status === "approved") {
    const { subject, text } = approvalEmail(user.full_name);
    await sendMail(user.official_email, subject, text);
    await notifyUser(id, {
      type: "account",
      title: "Your account is approved",
      body: "Welcome — you now have full access to the members' area.",
      link: "/portal",
    });
  } else if (status === "rejected") {
    const { subject, text } = rejectionEmail(user.full_name);
    await sendMail(user.official_email, subject, text);
  }
  revalidatePath("/admin");
}

export async function approveUser(formData: FormData) {
  await changeStatus(Number(formData.get("id")), "approved");
}
export async function rejectUser(formData: FormData) {
  await changeStatus(Number(formData.get("id")), "rejected");
}
export async function blockUser(formData: FormData) {
  await changeStatus(Number(formData.get("id")), "blocked");
}
export async function unblockUser(formData: FormData) {
  await changeStatus(Number(formData.get("id")), "approved");
}

export async function setRole(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const role = str(formData.get("role")) as UserRole;
  if (["member", "moderator", "admin"].includes(role)) {
    await setUserRole(id, role);
    revalidatePath("/admin");
  }
}

export async function removeUser(formData: FormData) {
  await requireAdmin();
  await deleteUser(Number(formData.get("id")));
  revalidatePath("/admin");
}

/* -------------------------------- Content ------------------------------- */

export type PostFormState = { ok: boolean; message: string } | null;

export async function addPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const staff = await requireStaff();
  const category = str(formData.get("category")) as PostCategory;
  const title = str(formData.get("title"));
  const excerpt = str(formData.get("excerpt"));
  if (!["travel", "welfare", "condolence", "association"].includes(category))
    return { ok: false, message: "Choose a board." };
  if (!title) return { ok: false, message: "Give the notice a title." };

  // Payment intent (defaults to an informational notice).
  const paymentMode = (str(formData.get("paymentMode")) || "none") as PaymentMode;
  if (!["none", "participation", "donation"].includes(paymentMode))
    return { ok: false, message: "Choose a valid payment mode." };
  let feeAmount: number | null = null;
  if (paymentMode === "participation") {
    feeAmount = Number(str(formData.get("feeAmount")));
    if (!Number.isFinite(feeAmount) || feeAmount <= 0)
      return { ok: false, message: "Enter a participation fee greater than zero." };
  }

  const stamp = Date.now();
  // Cover photos (shown on the card and at the top of the post).
  const cover = await saveUploads(formData.getAll("cover"), `post-${stamp}-cover`);

  // Repeatable sections: block-heading-i / block-body-i / block-images-i.
  const blockCount = Number(str(formData.get("blockCount"))) || 0;
  const blocks: { heading: string; body: string; images: string[] }[] = [];
  for (let i = 0; i < blockCount; i++) {
    const heading = str(formData.get(`block-heading-${i}`));
    const body = str(formData.get(`block-body-${i}`));
    const images = await saveUploads(formData.getAll(`block-images-${i}`), `post-${stamp}-b${i}`);
    if (!heading && !body && images.length === 0) continue; // skip empty section
    blocks.push({ heading, body, images });
  }

  await createPost({ category, title, excerpt, authorId: staff.id, cover, blocks, paymentMode, feeAmount });

  const mod = getModule(category);
  await notifyApprovedMembers(
    { type: "notice", title: `New ${mod?.title ?? "notice"}`, body: title, link: `/portal/${category}` },
    staff.id,
  );
  revalidatePath("/admin/content");
  revalidatePath(`/portal/${category}`);
  return { ok: true, message: "Notice published." };
}

export async function removePost(formData: FormData) {
  await requireStaff();
  await deletePost(Number(formData.get("id")));
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
  await closePoll(Number(formData.get("id")));
  revalidatePath("/admin/polls");
}

export async function reopenPollAction(formData: FormData) {
  await requireStaff();
  await reopenPoll(Number(formData.get("id")));
  revalidatePath("/admin/polls");
}

export async function deletePollAction(formData: FormData) {
  await requireStaff();
  await deletePoll(Number(formData.get("id")));
  revalidatePath("/admin/polls");
}

/* ------------------------------- Donations ------------------------------ */

async function setDonation(id: number, status: DonationStatus) {
  await requireStaff();
  const donation = await getDonation(id);
  await setDonationStatus(id, status);
  if (donation?.user_id) {
    const taka = `৳ ${Number(donation.amount).toLocaleString("en-BD")}`;
    const isTour = donation.kind === "participation";
    const noun = isTour ? "participation payment" : "contribution";
    const link = donation.post_id ? `/portal/notice/${donation.post_id}` : "/portal/welfare";
    await notifyUser(
      donation.user_id,
      status === "verified"
        ? { type: "donation", title: isTour ? "Participation confirmed" : "Donation verified", body: `Your ${taka} ${noun} has been confirmed. Thank you.`, link }
        : { type: "donation", title: isTour ? "Participation not confirmed" : "Donation not verified", body: `We couldn't confirm your ${taka} ${noun}. Please check the reference or contact the office.`, link },
    );
  }
  revalidatePath("/admin/donations");
}
export async function verifyDonation(formData: FormData) {
  await setDonation(Number(formData.get("id")), "verified");
}
export async function rejectDonation(formData: FormData) {
  await setDonation(Number(formData.get("id")), "rejected");
}

/* ------------------------------- Payments ------------------------------- */

export async function savePaymentMethod(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await updatePaymentMethod(id, {
    label: str(formData.get("label")),
    account_name: str(formData.get("account_name")),
    account_number: str(formData.get("account_number")),
    instructions: str(formData.get("instructions")),
    active: formData.get("active") === "on",
  });
  revalidatePath("/admin/payments");
}
