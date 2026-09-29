import "server-only";
import { headers } from "next/headers";
import { pool, ensureSchema } from "@/lib/db";

/**
 * Fixed-window attempt counter kept in Postgres, so limits hold across restarts
 * and across every app instance. `hit` records one attempt and says whether the
 * caller is still within `limit` attempts per `windowSec`.
 */
export async function hit(key: string, limit: number, windowSec: number): Promise<boolean> {
  await ensureSchema();
  const { rows } = await pool.query<{ count: number }>(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2)
                    THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2)
                           THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSec],
  );
  // Occasionally sweep windows that ended long ago so the table stays small.
  if (Math.random() < 0.01) {
    await pool.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
  }
  return rows[0].count <= limit;
}

/** Forget a key's attempts (e.g. after a successful login). */
export async function clearHits(key: string): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM rate_limits WHERE key = $1`, [key]);
}

/**
 * Best-effort client IP. Cloudflare's header is preferred; otherwise the first
 * X-Forwarded-For hop. Per-account limits back this up, since headers can be
 * forged when the app isn't behind a proxy.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
