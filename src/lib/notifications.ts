import "server-only";
import { pool, ensureSchema } from "@/lib/db";

export type NotificationType = "notice" | "donation" | "account";

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: Date;
};

type NewNotification = { type: NotificationType; title: string; body?: string | null; link?: string | null };

export async function notifyUser(userId: number, n: NewNotification): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5)`,
    [userId, n.type, n.title, n.body ?? null, n.link ?? null],
  );
}

/** Fan out to every approved member (optionally excluding one user, e.g. the author). */
export async function notifyApprovedMembers(n: NewNotification, exceptUserId?: number): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     SELECT id, $1, $2, $3, $4 FROM users
     WHERE status = 'approved' AND ($5::int IS NULL OR id <> $5)`,
    [n.type, n.title, n.body ?? null, n.link ?? null, exceptUserId ?? null],
  );
}

export async function listNotifications(userId: number, limit = 50): Promise<Notification[]> {
  await ensureSchema();
  const { rows } = await pool.query<Notification>(
    `SELECT id, type, title, body, link, read, created_at
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

export async function countUnread(userId: number): Promise<number> {
  await ensureSchema();
  const { rows } = await pool.query<{ n: string }>(
    `SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read = false`,
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function markAllRead(userId: number): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, [userId]);
}
