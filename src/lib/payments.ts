import "server-only";
import { pool, ensureSchema, isDbId } from "@/lib/db";

export type PaymentMethod = {
  id: number;
  kind: "bkash" | "nagad" | "rocket" | "bank" | "other";
  label: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  sort_order: number;
  active: boolean;
};

export type DonationStatus = "reported" | "verified" | "rejected";

/** 'donation' = open welfare giving; 'participation' = a fixed tour fee. */
export type ContributionKind = "donation" | "participation";

export type Donation = {
  id: number;
  user_id: number | null;
  post_id: number | null;
  kind: ContributionKind;
  donor_name: string;
  amount: string; // NUMERIC comes back as string from pg
  method: string;
  transaction_ref: string;
  note: string | null;
  status: DonationStatus;
  provider: string | null; // set by a real gateway; null while manual
  gateway_ref: string | null;
  created_at: Date;
  post_title: string | null; // joined from posts for admin display
};

export async function listPaymentMethods(activeOnly = true): Promise<PaymentMethod[]> {
  await ensureSchema();
  const { rows } = activeOnly
    ? await pool.query<PaymentMethod>(
        `SELECT * FROM payment_methods WHERE active = true ORDER BY sort_order, id`,
      )
    : await pool.query<PaymentMethod>(`SELECT * FROM payment_methods ORDER BY sort_order, id`);
  return rows;
}

export async function updatePaymentMethod(
  id: number,
  fields: { label: string; account_name: string; account_number: string; instructions: string; active: boolean },
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE payment_methods SET label=$2, account_name=$3, account_number=$4, instructions=$5, active=$6 WHERE id=$1`,
    [id, fields.label, fields.account_name, fields.account_number, fields.instructions, fields.active],
  );
}

export async function createDonation(d: {
  userId: number | null;
  postId: number | null;
  kind: ContributionKind;
  donorName: string;
  amount: number;
  method: string;
  transactionRef: string;
  note: string | null;
  provider?: string | null;
  gatewayRef?: string | null;
}): Promise<number> {
  await ensureSchema();
  // A gateway-confirmed contribution lands verified; a manual report is 'reported'.
  const status = d.gatewayRef ? "verified" : "reported";
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO donations
       (user_id, post_id, kind, donor_name, amount, method, transaction_ref, note, provider, gateway_ref, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      d.userId, d.postId, d.kind, d.donorName, d.amount, d.method, d.transactionRef,
      d.note, d.provider ?? null, d.gatewayRef ?? null, status,
    ],
  );
  return rows[0].id;
}

export async function listDonations(status?: DonationStatus): Promise<Donation[]> {
  await ensureSchema();
  const base = `SELECT d.*, p.title AS post_title
                FROM donations d LEFT JOIN posts p ON p.id = d.post_id`;
  const { rows } = status
    ? await pool.query<Donation>(
        `${base} WHERE d.status = $1 ORDER BY d.created_at DESC, d.id DESC`,
        [status],
      )
    : await pool.query<Donation>(`${base} ORDER BY d.created_at DESC, d.id DESC`);
  return rows;
}

export async function getDonation(id: number): Promise<Donation | null> {
  if (!isDbId(id)) return null;
  await ensureSchema();
  const { rows } = await pool.query<Donation>(`SELECT * FROM donations WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Verify or reject a reported contribution. Only a 'reported' row can change, so
 * a double click or a stale page can't flip a decision or re-notify the member.
 * Returns whether the row changed.
 */
export async function setDonationStatus(id: number, status: DonationStatus): Promise<boolean> {
  if (!isDbId(id)) return false;
  await ensureSchema();
  const { rowCount } = await pool.query(
    `UPDATE donations SET status = $2 WHERE id = $1 AND status = 'reported'`,
    [id, status],
  );
  return (rowCount ?? 0) > 0;
}

export type ContributionTotals = { verified: number; reported: number; count: number };

function tally(rows: { status: DonationStatus; sum: string; n: string }[]): ContributionTotals {
  let verified = 0, reported = 0, count = 0;
  for (const r of rows) {
    if (r.status === "verified") verified = Number(r.sum);
    if (r.status === "reported") reported = Number(r.sum);
    count += Number(r.n);
  }
  return { verified, reported, count };
}

/** Totals across all contributions, optionally scoped to one kind. */
export async function donationTotals(kind?: ContributionKind): Promise<ContributionTotals> {
  await ensureSchema();
  const { rows } = kind
    ? await pool.query<{ status: DonationStatus; sum: string; n: string }>(
        `SELECT status, COALESCE(sum(amount),0) AS sum, count(*) AS n
         FROM donations WHERE kind = $1 GROUP BY status`,
        [kind],
      )
    : await pool.query<{ status: DonationStatus; sum: string; n: string }>(
        `SELECT status, COALESCE(sum(amount),0) AS sum, count(*) AS n FROM donations GROUP BY status`,
      );
  return tally(rows);
}

/** Totals for a single post (the amount raised against that notice). */
export async function postTotals(postId: number): Promise<ContributionTotals> {
  await ensureSchema();
  const { rows } = await pool.query<{ status: DonationStatus; sum: string; n: string }>(
    `SELECT status, COALESCE(sum(amount),0) AS sum, count(*) AS n
     FROM donations WHERE post_id = $1 GROUP BY status`,
    [postId],
  );
  return tally(rows);
}
