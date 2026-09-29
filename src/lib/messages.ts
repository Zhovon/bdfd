/**
 * Language-independent notifications and emails. Instead of storing finished
 * English sentences, a notification records what happened (its `kind` plus a
 * few `params`) and is rendered in the reader's language when shown. Emails go
 * out in Bangla and English together, since the recipient's language isn't
 * known when they're sent.
 *
 * Pure functions only (no database, no request state) so they can be unit-tested.
 */
import { en } from "@/lib/dictionaries/en";
import { bn } from "@/lib/dictionaries/bn";

type Dict = typeof en;

/** Fill "{name}" placeholders; unknown placeholders are left as-is. */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

/** "৳ 3,000" in the reader's digits (Bangla digits for bn-BD). */
export function formatTaka(amount: number, intlLocale: string): string {
  return `৳ ${new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 }).format(amount)}`;
}

/* ----------------------------- Notifications ----------------------------- */

export type BoardSlug = keyof Dict["boards"];

export type NotificationMessage =
  | { kind: "accountApproved" }
  | { kind: "newNotice"; board: BoardSlug; noticeTitle: string }
  | { kind: "paymentConfirmed" | "paymentRejected"; amount: number; tour: boolean };

/** The title/body a notification shows, in the given dictionary's language. */
export function renderNotification(msg: NotificationMessage, t: Dict): { title: string; body: string } {
  const n = t.notif;
  switch (msg.kind) {
    case "accountApproved":
      return { title: n.accountApprovedTitle, body: n.accountApprovedBody };
    case "newNotice":
      // The notice title is member-written content and stays as written.
      return {
        title: interpolate(n.newNotice, { board: t.boards[msg.board]?.title ?? msg.board }),
        body: msg.noticeTitle,
      };
    case "paymentConfirmed":
    case "paymentRejected": {
      const confirmed = msg.kind === "paymentConfirmed";
      const title = confirmed
        ? msg.tour ? n.tourConfirmedTitle : n.donationConfirmedTitle
        : msg.tour ? n.tourRejectedTitle : n.donationRejectedTitle;
      const body = interpolate(confirmed ? n.paymentConfirmedBody : n.paymentRejectedBody, {
        amount: formatTaka(msg.amount, t.intl),
      });
      return { title, body };
    }
  }
}

/**
 * Parse a stored notification back into a message, or null for rows written
 * before messages were stored this way (those show their saved text instead).
 */
export function parseNotification(kind: string | null, params: unknown): NotificationMessage | null {
  const p = (params ?? {}) as Record<string, unknown>;
  switch (kind) {
    case "accountApproved":
      return { kind };
    case "newNotice":
      return typeof p.board === "string" && typeof p.noticeTitle === "string"
        ? { kind, board: p.board as BoardSlug, noticeTitle: p.noticeTitle }
        : null;
    case "paymentConfirmed":
    case "paymentRejected":
      return typeof p.amount === "number" && typeof p.tour === "boolean"
        ? { kind, amount: p.amount, tour: p.tour }
        : null;
    default:
      return null;
  }
}

/* --------------------------------- Emails -------------------------------- */

export type EmailMessage =
  | { kind: "approved"; name: string }
  | { kind: "rejected"; name: string }
  | { kind: "reset"; name: string; url: string };

/** One language's version of an email. */
function emailIn(t: Dict, msg: EmailMessage): { subject: string; text: string } {
  const e = t.email;
  const params = { site: t.brand.name, name: msg.name, url: msg.kind === "reset" ? msg.url : "" };
  const [subject, body] =
    msg.kind === "approved"
      ? [e.approvedSubject, e.approvedBody]
      : msg.kind === "rejected"
        ? [e.rejectedSubject, e.rejectedBody]
        : [e.resetSubject, e.resetBody];
  const text = [interpolate(e.greeting, params), interpolate(body, params), interpolate(e.signOff, params)].join(
    "\n\n",
  );
  return { subject, text };
}

/** A bilingual email: Bangla first, then English, under a combined subject. */
export function buildEmail(msg: EmailMessage): { subject: string; text: string } {
  const bangla = emailIn(bn, msg);
  const english = emailIn(en, msg);
  return {
    subject: `${bangla.subject} / ${english.subject}`,
    text: `${bangla.text}\n\n────────────\n\n${english.text}`,
  };
}
