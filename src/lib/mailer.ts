import "server-only";
import nodemailer from "nodemailer";

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
