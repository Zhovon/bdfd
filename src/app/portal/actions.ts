"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { acceptsPayment, castVote, getPost } from "@/lib/content";
import { createDonation, type ContributionKind } from "@/lib/payments";
import { parseId, updateProfile } from "@/lib/db";
import { saveUpload } from "@/lib/uploads";
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

  // Every payment is made against a post; the post is the source of truth for
  // what kind of payment this is and — for a tour — how much it costs.
  const postId = parseId(formData.get("postId"));
  if (!postId) return { ok: false, message: "We couldn't tell which notice this payment is for." };
  const post = await getPost(postId);
  if (!post || !acceptsPayment(post))
    return { ok: false, message: "This notice isn't accepting payments." };
  if (!post.paymentOpen)
    return { ok: false, message: "Payments for this notice are now closed." };

  const kind: ContributionKind = post.paymentMode === "participation" ? "participation" : "donation";
  const method = str(formData.get("method"));
  const transactionRef = str(formData.get("transactionRef"));
  const note = str(formData.get("note"));

  // Participation is the fixed fee set on the post (client amount is ignored);
  // a donation is whatever the member chose to give.
  const amount = kind === "participation" ? post.feeAmount ?? 0 : Number(str(formData.get("amount")));

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return { ok: false, message: "Enter a valid amount." };
  if (!method) return { ok: false, message: "Choose how you paid." };
  if (!transactionRef) return { ok: false, message: "Enter the transaction ID / reference." };

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
  const thanks =
    kind === "participation"
      ? "Thank you — your participation payment is recorded and awaiting verification by the administration."
      : "Thank you — your donation is recorded and awaiting verification by the administration.";
  return { ok: true, message: thanks };
}

/* -------------------------------- Profile ------------------------------- */

export type ProfileState = { ok: boolean; message: string } | null;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const mobile = str(formData.get("mobile"));
  const designation = str(formData.get("designation"));
  const posting = str(formData.get("posting"));
  const bloodGroup = str(formData.get("bloodGroup")) || null;
  const bloodAvailable = formData.get("bloodAvailable") === "on";

  if (!/^[0-9+\-\s]{6,20}$/.test(mobile)) return { ok: false, message: "Enter a valid mobile number." };
  if (!designation || !posting) return { ok: false, message: "Designation and posting are required." };

  let avatarUrl: string | null = null;
  try {
    avatarUrl = await saveUpload(formData.get("avatar"), `u${user.id}-${Date.now()}`);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't upload that photo." };
  }

  await updateProfile(user.id, { mobile, designation, posting, bloodGroup, bloodAvailable, avatarUrl });
  revalidatePath("/portal/profile");
  return { ok: true, message: "Profile updated." };
}
