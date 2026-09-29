import { createHmac } from "node:crypto";
import sharp from "sharp";
import { Pool } from "pg";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** Refuse to touch a database whose name doesn't look disposable. */
export function e2eDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("Set E2E_DATABASE_URL to a disposable Postgres database.");
  const name = new URL(url).pathname.slice(1);
  if (!/test|e2e/i.test(name)) {
    throw new Error(`Refusing to run: database "${name}" doesn't look like a test database (needs "test" or "e2e").`);
  }
  return url;
}

let pool: Pool | null = null;
/** Direct database access for arranging and checking test data. */
export function db(): Pool {
  pool ??= new Pool({ connectionString: e2eDatabaseUrl(), max: 2 });
  return pool;
}

/** Close the pool (each spec file's afterAll); the next db() call opens a new one. */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
}

const hmac = (data: string) => createHmac("sha256", E2E.sessionSecret).update(data).digest("base64url");

/** A valid session cookie value, signed the way the app signs them. */
export function sessionCookie(userId: number, version = 0): string {
  const payload = `${userId}.${version}.${Date.now() + 3_600_000}`;
  return `${payload}.${hmac(payload)}`;
}

/** A valid password-reset token for a user. */
export function resetToken(userId: number, version = 0): string {
  const payload = `${userId}.${version}.${Date.now() + 3_600_000}`;
  return `${payload}.${hmac(`reset:${payload}`)}`;
}

/** Sign a browser context in as a user (skips the login form) and pick a language. */
export async function signIn(context: BrowserContext, email: string, lang: "en" | "bn" = "en") {
  const { rows } = await db().query<{ id: number; session_version: number }>(
    `SELECT id, session_version FROM users WHERE official_email = $1`,
    [email],
  );
  expect(rows[0], `no user ${email}`).toBeTruthy();
  await context.addCookies([
    { name: "portal_session", value: sessionCookie(rows[0].id, rows[0].session_version), url: E2E.baseURL },
    { name: "lang", value: lang, url: E2E.baseURL },
  ]);
}

export async function setLang(context: BrowserContext, lang: "en" | "bn") {
  await context.addCookies([{ name: "lang", value: lang, url: E2E.baseURL }]);
}

/** Insert a member directly (registration needs a live captcha). */
export async function createMember(opts: {
  name: string;
  email: string;
  status?: "pending" | "approved" | "rejected" | "blocked";
  passwordHash?: string;
}): Promise<number> {
  const { rows } = await db().query<{ id: number }>(
    `INSERT INTO users (full_name, official_email, mobile, service_id, designation, posting, password_hash, status, approved_at)
     VALUES ($1, $2, '01711000000', 'SVC', 'AO', 'Dhaka', $3, $4, CASE WHEN $4 = 'approved' THEN now() END)
     RETURNING id`,
    [opts.name, opts.email, opts.passwordHash ?? "x", opts.status ?? "approved"],
  );
  return rows[0].id;
}

/**
 * A camera-sized JPEG (noise, so it barely compresses): about 1.5 MB at the
 * default size — larger than the 1 MB Server Action default that once broke
 * publishing.
 */
export async function photo(width = 2200, height = 1650): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919 + ((i / width) | 0) * 31) & 255;
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 85 }).toBuffer();
}

/** Accept every confirm() dialog on the page (delete/block buttons ask first). */
export function acceptDialogs(page: Page) {
  page.on("dialog", (d) => void d.accept());
}
