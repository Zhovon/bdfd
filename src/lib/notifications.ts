import "server-only";
import { pool, ensureSchema } from "@/lib/db";
import { en } from "@/lib/dictionaries/en";
import { renderNotification, type NotificationMessage } from "@/lib/messages";

export type NotificationType = "notice" | "donation" | "account";

export type Notification = {
  id: number;
  type: NotificationType;
  /** Rendered in the reader's language when set (see lib/messages.ts). */
  kind: string | null;
  params: unknown;
  /** English text saved with the row; shown for rows that predate `kind`. */
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: Date;
};

const TYPE_OF: Record<NotificationMessage["kind"], NotificationType> = {
  accountApproved: "account",
  newNotice: "notice",
  paymentConfirmed: "donation",
  paymentRejected: "donation",
};

/** Column values for a message: its kind and params, plus English fallback text. */
function columns(msg: NotificationMessage) {
  const { kind, ...params } = msg;
  const { title, body } = renderNotification(msg, en);
  return { type: TYPE_OF[kind], kind, params: JSON.stringify(params), title, body };
}

export async function notifyUser(userId: number, msg: NotificationMessage, link: string | null): Promise<void> {
  await ensureSchema();
  const c = columns(msg);
  await pool.query(
    `INSERT INTO notifications (user_id, type, kind, params, title, body, link)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)`,
    [userId, c.type, c.kind, c.params, c.title, c.body, link],
  );
}

/** Fan out to every approved member (optionally excluding one user, e.g. the author). */
export async function notifyApprovedMembers(
  msg: NotificationMessage,
  link: string | null,
  exceptUserId?: number,
): Promise<void> {
  await ensureSchema();
  const c = columns(msg);
  await pool.query(
    `INSERT INTO notifications (user_id, type, kind, params, title, body, link)
     SELECT id, $1, $2, $3::jsonb, $4, $5, $6 FROM users
     WHERE status = 'approved' AND ($7::int IS NULL OR id <> $7)`,
    [c.type, c.kind, c.params, c.title, c.body, link, exceptUserId ?? null],
  );
}

export async function listNotifications(userId: number, limit = 50): Promise<Notification[]> {
  await ensureSchema();
  const { rows } = await pool.query<Notification>(
    `SELECT id, type, kind, params, title, body, link, read, created_at
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
