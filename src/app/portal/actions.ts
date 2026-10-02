"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { acceptsPayment, castVote, getPost } from "@/lib/content";
import { createDonation, transactionRefTaken, type ContributionKind } from "@/lib/payments";
import { parseId, updateProfile } from "@/lib/db";
import { saveUpload, deleteUploads, UploadError } from "@/lib/uploads";
import { getDict } from "@/lib/i18n";
import { markAllRead } from "@/lib/notifications";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function markNotificationsRead(): Promise<void> {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/portal", "layout");
}

/* --------------------------------- Poll --------------------------------- */

export async function castVoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const pollId = parseId(formData.get("pollId"));
  const optionId = parseId(formData.get("optionId"));
  if (pollId && optionId) {
    await castVote(pollId, optionId, user.id);
    revalidatePath("/portal/travel");
  }
}

/* ------------------------------- Donations ------------------------------ */

export type DonationState = { ok: boolean; message: string } | null;

export async function reportDonation(_prev: DonationState, formData: FormData): Promise<DonationState> {
  const user = await requireUser();
  const m = (await getDict()).msg;

  // Every payment is made against a post; the post is the source of truth for
  // what kind of payment this is and — for a tour — how much it costs.
  const postId = parseId(formData.get("postId"));
  if (!postId) return { ok: false, message: m.unknownNotice };
  const post = await getPost(postId);
  if (!post || !acceptsPayment(post))
    return { ok: false, message: m.notAccepting };
  if (!post.paymentOpen)
    return { ok: false, message: m.paymentsClosed };

  const kind: ContributionKind = post.paymentMode === "participation" ? "participation" : "donation";
  const method = str(formData.get("method"));
  const transactionRef = str(formData.get("transactionRef"));
  const note = str(formData.get("note"));

  // Participation is the fixed fee set on the post (client amount is ignored);
  // a donation is whatever the member chose to give.
  const amount = kind === "participation" ? post.feeAmount ?? 0 : Number(str(formData.get("amount")));

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return { ok: false, message: m.enterAmount };
  if (!method) return { ok: false, message: m.chooseMethod };
  if (!transactionRef) return { ok: false, message: m.enterRef };
  if (await transactionRefTaken(transactionRef))
    return { ok: false, message: m.refTaken };

  await createDonation({
    userId: user.id,
    postId,
    kind,
    donorName: user.full_name,
    amount,
    method,
    transactionRef,
    note: note || null,
  });
  revalidatePath(`/portal/notice/${postId}`);
  revalidatePath(`/portal/${post.category}`);
  return { ok: true, message: kind === "participation" ? m.thanksTour : m.thanksDonation };
}

/* -------------------------------- Profile ------------------------------- */

export type ProfileState = { ok: boolean; message: string } | null;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const m = (await getDict()).msg;
  const mobile = str(formData.get("mobile"));
  const designation = str(formData.get("designation"));
  const posting = str(formData.get("posting"));
  const address = str(formData.get("address"));
  const bloodGroup = str(formData.get("bloodGroup")) || null;
  const bloodAvailable = formData.get("bloodAvailable") === "on";

  if (!/^[0-9+\-\s]{6,20}$/.test(mobile)) return { ok: false, message: m.enterMobile };
  if (!address) return { ok: false, message: m.enterAddress };
  if (!designation || !posting) return { ok: false, message: m.designationPosting };

  let avatarUrl: string | null = null;
  try {
    avatarUrl = await saveUpload(formData.get("avatar"), `u${user.id}-${Date.now()}`, { avatar: true });
  } catch (err) {
    return { ok: false, message: err instanceof UploadError ? m[err.code] : m.photoFailed };
  }

  try {
    await updateProfile(user.id, { mobile, designation, posting, address, bloodGroup, bloodAvailable, avatarUrl });
  } catch (err) {
    await deleteUploads([avatarUrl]);
    throw err;
  }
  // A new photo replaces the old one — remove the old file.
  if (avatarUrl && user.avatar_url) await deleteUploads([user.avatar_url]);
  revalidatePath("/portal/profile");
  return { ok: true, message: m.profileSaved };
}
