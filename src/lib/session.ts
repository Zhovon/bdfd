import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById, type User } from "@/lib/db";

const COOKIE = "portal_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

const secret = () => process.env.SESSION_SECRET ?? "insecure-dev-secret";

function sign(userId: number): string {
  const payload = String(userId);
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verify(value: string): number | null {
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const id = Number(payload);
  return Number.isInteger(id) ? id : null;
}

export async function setSession(userId: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(userId), {
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
  const id = verify(raw);
  if (id == null) return null;
  const user = await getUserById(id);
  if (!user || user.status !== "approved") return null;
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

export function makeResetToken(userId: number): string {
  const expiry = Date.now() + RESET_TTL_MS;
  const payload = `${userId}.${expiry}`;
  const sig = createHmac("sha256", secret()).update(`reset:${payload}`).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyResetToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const expected = createHmac("sha256", secret()).update(`reset:${idStr}.${expStr}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(expStr)) return null;
  const id = Number(idStr);
  return Number.isInteger(id) ? id : null;
}
