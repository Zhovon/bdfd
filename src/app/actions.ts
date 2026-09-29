"use server";

import { redirect } from "next/navigation";
import { createUser, EmailTakenError, getUserByEmail, getUserById, setPassword } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSession, clearSession, makeResetToken, verifyResetToken } from "@/lib/session";
import { sendMail, resetEmail } from "@/lib/mailer";
import { verifyCaptcha } from "@/lib/captcha";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/* ----------------------------- Registration ----------------------------- */

type RegField = "fullName" | "officialEmail" | "mobile" | "serviceId" | "designation" | "posting" | "password" | "confirm" | "captcha";

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
    officialEmail: str(formData.get("officialEmail")).toLowerCase(),
    mobile: str(formData.get("mobile")),
    serviceId: str(formData.get("serviceId")),
    designation: str(formData.get("designation")),
    posting: str(formData.get("posting")),
    password: str(formData.get("password")),
    confirm: str(formData.get("confirm")),
  };
  const fieldErrors: RegisterState["fieldErrors"] = {};
  if (v.fullName.length < 2) fieldErrors.fullName = "Please enter your full name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.officialEmail)) fieldErrors.officialEmail = "Enter a valid official email.";
  if (!/^[0-9+\-\s]{6,20}$/.test(v.mobile)) fieldErrors.mobile = "Enter a valid mobile number.";
  if (!v.serviceId) fieldErrors.serviceId = "Enter your PDS / Service ID.";
  if (!v.designation) fieldErrors.designation = "Enter your designation.";
  if (!v.posting) fieldErrors.posting = "Enter your present posting.";
  if (v.password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (v.confirm !== v.password) fieldErrors.confirm = "Passwords don't match.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  // Bot check — verified server-side with Cloudflare.
  const captchaOk = await verifyCaptcha(str(formData.get("cf-turnstile-response")));
  if (!captchaOk) {
    return {
      ok: false,
      message: "Couldn't verify you're human — please complete the check and try again.",
      fieldErrors: { captcha: "Verification failed. Try the check again." },
    };
  }

  try {
    const passwordHash = await hashPassword(v.password);
    await createUser({
      fullName: v.fullName,
      officialEmail: v.officialEmail,
      mobile: v.mobile,
      serviceId: v.serviceId,
      designation: v.designation,
      posting: v.posting,
      passwordHash,
    });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return { ok: false, message: err.message, fieldErrors: { officialEmail: err.message } };
    }
    console.error("registerUser failed:", err);
    return { ok: false, message: "Couldn't submit your registration. Please try again shortly." };
  }

  return {
    ok: true,
    message: "Registration received. An administrator will verify your details and email you once your account is approved.",
  };
}

/* -------------------------------- Login --------------------------------- */

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = str(formData.get("email")).toLowerCase();
  const password = str(formData.get("password"));

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await getUserByEmail(email);
  // Same message whether the email is unknown or the password is wrong.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Incorrect email or password." };
  }

  if (user.status === "pending") return { error: "Your account is awaiting administrator approval." };
  if (user.status === "rejected") return { error: "Your registration was not approved. Contact the administration." };
  if (user.status === "blocked") return { error: "This account has been blocked. Contact the administration." };

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
  const user = email ? await getUserByEmail(email) : null;

  // Only send for real, approved accounts — but always show the same message.
  if (user && user.status === "approved") {
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const url = `${base}/reset?token=${makeResetToken(user.id, user.session_version)}`;
    const { subject, text } = resetEmail(user.full_name, url);
    await sendMail(user.official_email, subject, text);
  }

  return {
    done: true,
    message: "If that email belongs to an approved account, we've sent a reset link. Check your inbox.",
  };
}

export type ResetState = { error: string } | null;

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = str(formData.get("token"));
  const password = str(formData.get("password"));
  const confirm = str(formData.get("confirm"));

  const invalid = { error: "This reset link is invalid or has expired. Request a new one." };
  const reset = verifyResetToken(token);
  if (!reset) return invalid;
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  // The link is single-use: it must still match the account's current version,
  // and the account must still be approved.
  const user = await getUserById(reset.id);
  if (!user || user.status !== "approved" || user.session_version !== reset.version) return invalid;

  if (!(await setPassword(user.id, await hashPassword(password), reset.version))) return invalid;
  redirect("/login?reset=1");
}
