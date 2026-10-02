"use server";

import { redirect } from "next/navigation";
import { createUser, EmailTakenError, getUserByEmail, getUserById, setPassword } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSession, clearSession, makeResetToken, verifyResetToken } from "@/lib/session";
import { sendMail } from "@/lib/mailer";
import { buildEmail } from "@/lib/messages";
import { verifyCaptcha } from "@/lib/captcha";
import { hit, clearHits, clientIp } from "@/lib/ratelimit";
import { getDict } from "@/lib/i18n";

const MINUTE = 60;

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/* ----------------------------- Registration ----------------------------- */

type RegField = "fullName" | "email" | "mobile" | "address" | "designation" | "posting" | "password" | "confirm" | "captcha";

export type RegisterState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<RegField, string>>;
};

export async function registerUser(
  _prev: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const v = {
    fullName: str(formData.get("fullName")),
    email: str(formData.get("email")).toLowerCase(),
    mobile: str(formData.get("mobile")),
    address: str(formData.get("address")),
    designation: str(formData.get("designation")),
    posting: str(formData.get("posting")),
    password: str(formData.get("password")),
    confirm: str(formData.get("confirm")),
  };
  const m = (await getDict()).msg;
  const fieldErrors: RegisterState["fieldErrors"] = {};
  if (v.fullName.length < 2) fieldErrors.fullName = m.enterName;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) fieldErrors.email = m.enterEmail;
  if (!/^[0-9+\-\s]{6,20}$/.test(v.mobile)) fieldErrors.mobile = m.enterMobile;
  if (!v.address) fieldErrors.address = m.enterAddress;
  if (!v.designation) fieldErrors.designation = m.enterDesignation;
  if (!v.posting) fieldErrors.posting = m.enterPosting;
  if (v.password.length < 8) fieldErrors.password = m.passwordShort;
  if (v.confirm !== v.password) fieldErrors.confirm = m.passwordMismatch;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: m.fixFields, fieldErrors };
  }

  // Bot check — verified server-side with Cloudflare.
  const captchaOk = await verifyCaptcha(str(formData.get("cf-turnstile-response")));
  if (!captchaOk) {
    return { ok: false, message: m.captchaFailed, fieldErrors: { captcha: m.captchaRetry } };
  }

  try {
    const passwordHash = await hashPassword(v.password);
    await createUser({
      fullName: v.fullName,
      email: v.email,
      mobile: v.mobile,
      address: v.address,
      designation: v.designation,
      posting: v.posting,
      passwordHash,
    });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return { ok: false, message: m.emailTaken, fieldErrors: { email: m.emailTaken } };
    }
    console.error("registerUser failed:", err);
    return { ok: false, message: m.registerFailed };
  }

  return { ok: true, message: m.registered };
}

/* -------------------------------- Login --------------------------------- */

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = str(formData.get("email")).toLowerCase();
  const password = str(formData.get("password"));
  const m = (await getDict()).msg;

  if (!email || !password) return { error: m.enterEmailPassword };

  // Slow down password guessing: per account and per network address.
  const ip = await clientIp();
  const allowed =
    (await hit(`login:ip:${ip}`, 30, 15 * MINUTE)) && (await hit(`login:email:${email}`, 8, 15 * MINUTE));
  if (!allowed) return { error: m.tooManyLogins };

  const user = await getUserByEmail(email);
  // Same message whether the email is unknown or the password is wrong.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: m.badLogin };
  }

  if (user.status === "pending") return { error: m.pending };
  if (user.status === "rejected") return { error: m.rejected };
  if (user.status === "blocked") return { error: m.blocked };

  await clearHits(`login:email:${email}`);
  await setSession(user.id, user.session_version);
  redirect(user.role === "member" ? "/portal" : "/admin");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}

/* --------------------------- Password reset ----------------------------- */

export type ForgotState = { done: boolean; message: string } | null;

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = str(formData.get("email")).toLowerCase();
  const m = (await getDict()).msg;
  if (!email) return { done: false, message: m.enterEmail };

  if (!(await verifyCaptcha(str(formData.get("cf-turnstile-response"))))) {
    return { done: false, message: m.captchaFailed };
  }
  if (!(await hit(`forgot:ip:${await clientIp()}`, 10, 60 * MINUTE))) {
    return { done: false, message: m.tooManyResets };
  }
  // Cap emails per account without revealing whether the account exists.
  const underCap = await hit(`forgot:email:${email}`, 3, 60 * MINUTE);
  const user = underCap ? await getUserByEmail(email) : null;

  // Only send for real, approved accounts — but always show the same message.
  if (user && user.status === "approved") {
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const url = `${base}/reset?token=${makeResetToken(user.id, user.session_version)}`;
    const { subject, text } = buildEmail({ kind: "reset", name: user.full_name, url });
    await sendMail(user.email, subject, text);
  }

  return { done: true, message: m.resetSent };
}

export type ResetState = { error: string } | null;

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = str(formData.get("token"));
  const password = str(formData.get("password"));
  const confirm = str(formData.get("confirm"));

  const m = (await getDict()).msg;
  const invalid = { error: m.resetInvalid };
  const reset = verifyResetToken(token);
  if (!reset) return invalid;
  if (password.length < 8) return { error: m.passwordShort };
  if (password !== confirm) return { error: m.passwordMismatch };

  // The link is single-use: it must still match the account's current version,
  // and the account must still be approved.
  const user = await getUserById(reset.id);
  if (!user || user.status !== "approved" || user.session_version !== reset.version) return invalid;

  if (!(await setPassword(user.id, await hashPassword(password), reset.version))) return invalid;
  redirect("/login?reset=1");
}
