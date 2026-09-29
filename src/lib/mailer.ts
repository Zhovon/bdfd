import "server-only";
import nodemailer from "nodemailer";
import { org } from "@/lib/site";

const from = () => process.env.MAIL_FROM ?? "We the Food Family <no-reply@portal.gov.bd>";

/**
 * Send an email via SMTP if configured; otherwise log it to the server console.
 * The console fallback keeps local development working without credentials.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    console.info(`\n📧 [email not sent — no SMTP configured]\n  to: ${to}\n  subject: ${subject}\n  ${text}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  await transport.sendMail({ from: from(), to, subject, text });
}

export function approvalEmail(name: string): { subject: string; text: string } {
  return {
    subject: "Your portal registration is approved",
    text: `Dear ${name},\n\nYour registration for ${org.name} has been approved. You can now log in and access members-only content.\n\nRegards,\nPortal Administration`,
  };
}

export function resetEmail(name: string, url: string): { subject: string; text: string } {
  return {
    subject: "Reset your portal password",
    text: `Dear ${name},\n\nWe received a request to reset your password. Use the link below within one hour to set a new password:\n\n${url}\n\nIf you didn't request this, you can ignore this email.\n\nRegards,\nPortal Administration`,
  };
}

export function rejectionEmail(name: string): { subject: string; text: string } {
  return {
    subject: "Your portal registration could not be approved",
    text: `Dear ${name},\n\nWe were unable to verify your registration for ${org.name} at this time. Please contact the administration if you believe this is an error.\n\nRegards,\nPortal Administration`,
  };
}
