import "server-only";
import { pool, ensureSchema } from "@/lib/db";

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

export type Donation = {
  id: number;
  user_id: number | null;
  donor_name: string;
  amount: string; // NUMERIC comes back as string from pg
  method: string;
  transaction_ref: string;
  note: string | null;
  status: DonationStatus;
  created_at: Date;
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
  donorName: string;
  amount: number;
  method: string;
  transactionRef: string;
  note: string | null;
}): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO donations (user_id, donor_name, amount, method, transaction_ref, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [d.userId, d.donorName, d.amount, d.method, d.transactionRef, d.note],
  );
}

export async function listDonations(status?: DonationStatus): Promise<Donation[]> {
  await ensureSchema();
  const { rows } = status
    ? await pool.query<Donation>(
        `SELECT * FROM donations WHERE status = $1 ORDER BY created_at DESC, id DESC`,
        [status],
      )
    : await pool.query<Donation>(`SELECT * FROM donations ORDER BY created_at DESC, id DESC`);
  return rows;
}

export async function getDonation(id: number): Promise<Donation | null> {
  await ensureSchema();
  const { rows } = await pool.query<Donation>(`SELECT * FROM donations WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function setDonationStatus(id: number, status: DonationStatus): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE donations SET status = $2 WHERE id = $1`, [id, status]);
}

export async function donationTotals(): Promise<{ verified: number; reported: number; count: number }> {
  await ensureSchema();
  const { rows } = await pool.query<{ status: DonationStatus; sum: string; n: string }>(
    `SELECT status, COALESCE(sum(amount),0) AS sum, count(*) AS n FROM donations GROUP BY status`,
  );
  let verified = 0, reported = 0, count = 0;
  for (const r of rows) {
    if (r.status === "verified") verified = Number(r.sum);
    if (r.status === "reported") reported = Number(r.sum);
    count += Number(r.n);
  }
  return { verified, reported, count };
}
