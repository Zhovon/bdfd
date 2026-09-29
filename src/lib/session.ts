import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById, type User } from "@/lib/db";

const COOKIE = "portal_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  // A guessable secret would let anyone forge a login cookie — refuse in production.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return "insecure-dev-secret";
}

const hmac = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

function sigMatches(sig: string, expected: string): boolean {
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cookie value: `userId.sessionVersion.expiry.sig`. The expiry is enforced on the
 * server (not just by the browser), and the version must match the user's row —
 * bumping it on a password change signs out every existing session.
 */
function sign(userId: number, version: number): string {
  const payload = `${userId}.${version}.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${hmac(payload)}`;
}

function verify(value: string): { id: number; version: number } | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [idStr, verStr, expStr, sig] = parts;
  if (!sigMatches(sig, hmac(`${idStr}.${verStr}.${expStr}`))) return null;
  if (!(Date.now() < Number(expStr))) return null;
  const id = Number(idStr);
  const version = Number(verStr);
  return Number.isInteger(id) && Number.isInteger(version) ? { id, version } : null;
}

export async function setSession(userId: number, version: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(userId, version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** The logged-in, still-approved user — or null. Blocked/removed users fail closed. */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const session = verify(raw);
  if (!session) return null;
  const user = await getUserById(session.id);
  if (!user || user.status !== "approved" || user.session_version !== session.version) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Staff = admin or moderator. Gate for the /admin area and content/polls/donations. */
export async function requireStaff(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isStaff(user)) redirect("/portal");
  return user;
}

/** Admin only. Gate for user management, roles, payment methods, and the CSV export. */
export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Moderators are staff but not admins — send them to a page they can use.
  if (user.role !== "admin") redirect("/admin/content");
  return user;
}

export function isStaff(user: User | null): boolean {
  return user?.role === "admin" || user?.role === "moderator";
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

/* ----------------------- Password reset tokens -------------------------- */

const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

/**
 * Token: `userId.sessionVersion.expiry.sig`. Setting a new password bumps the
 * version, so a link works once and dies with any later password change.
 */
export function makeResetToken(userId: number, version: number): string {
  const payload = `${userId}.${version}.${Date.now() + RESET_TTL_MS}`;
  return `${payload}.${hmac(`reset:${payload}`)}`;
}

export function verifyResetToken(token: string): { id: number; version: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [idStr, verStr, expStr, sig] = parts;
  if (!sigMatches(sig, hmac(`reset:${idStr}.${verStr}.${expStr}`))) return null;
  if (!(Date.now() < Number(expStr))) return null;
  const id = Number(idStr);
  const version = Number(verStr);
  return Number.isInteger(id) && Number.isInteger(version) ? { id, version } : null;
}
