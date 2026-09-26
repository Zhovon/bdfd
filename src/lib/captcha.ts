import "server-only";
import { headers } from "next/headers";

// Cloudflare Turnstile test keys (always pass) — overridden by env in production.
const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET = "1x0000000000000000000000000000000AA";

/** Public site key for the widget — safe to send to the browser. */
export const captchaSiteKey = () => process.env.TURNSTILE_SITE_KEY || TEST_SITE_KEY;

/**
 * Verify a Turnstile token server-side against Cloudflare. Returns true only on
 * a confirmed pass. Fails closed on a missing token or a verification error.
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY || TEST_SECRET;

  const body = new URLSearchParams({ secret, response: token });
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) body.set("remoteip", ip);
  } catch {
    // headers() unavailable outside a request scope — proceed without remoteip.
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed to reach Cloudflare:", err);
    return false;
  }
}
