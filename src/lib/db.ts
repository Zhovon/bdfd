import "server-only";
import { Pool, type PoolClient } from "pg";
import { hashPassword } from "@/lib/password";
import { likePattern, pageWindow, type Paged } from "@/lib/paging";

// Reuse the pool across hot reloads in dev so we don't exhaust connections.
const globalForDb = globalThis as unknown as { _portalPool?: Pool };

const connectionString = process.env.DATABASE_URL;

// Local docker Postgres speaks no TLS; hosted providers (Supabase, Neon, …)
// require it. Enable SSL whenever the host isn't local. `rejectUnauthorized:
// false` encrypts in transit without pinning the provider's CA — harden to a
// CA-verified connection later if needed.
const isRemoteDb =
  !!connectionString && !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);

export const pool =
  globalForDb._portalPool ??
  new Pool({
    connectionString,
    max: 5,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb._portalPool = pool;
}

/** Run `fn` inside a single transaction; rolls back if it throws. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** A positive integer that fits a Postgres INTEGER column (SERIAL ids). */
export const isDbId = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 2147483647;

/** Parse a route/form value into a valid row id, or null. */
export const parseId = (v: unknown): number | null => {
  const n = typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : typeof v === "number" ? v : NaN;
  return isDbId(n) ? n : null;
};

export type UserRole = "member" | "moderator" | "admin";
export type UserStatus = "pending" | "approved" | "rejected" | "blocked";

export type User = {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
    designation: string;
  posting: string;
  address: string | null;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  blood_group: string | null;
  blood_available: boolean;
  created_at: Date;
  approved_at: Date | null;
  session_version: number;
};

export type UserWithHash = User & { password_hash: string };

let schemaReady: Promise<void> | null = null;

// Bump when the DDL below changes so the next deploy re-runs the migration once.
// Between changes, cold serverless instances skip the ~20 DDL round-trips.
const SCHEMA_VERSION = 7;

/**
 * Create every table and seed defaults on first use. For a prototype this stands
 * in for a migration; swap for a real migration tool before production.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      // Fast path: a tiny version marker lets a fresh serverless instance skip
      // the whole migration when the schema is already at the current version —
      // two cheap queries instead of ~20 DDL round-trips to the database.
      await pool.query(`CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)`);
      if ((await schemaVersion(pool)) >= SCHEMA_VERSION) return;

      // Several instances can cold-start together: take a session-level advisory
      // lock so only one migrates, and re-check once the lock is ours.
      const db = await pool.connect();
      try {
        await db.query(`SELECT pg_advisory_lock($1)`, [SCHEMA_LOCK]);
        if ((await schemaVersion(db)) >= SCHEMA_VERSION) return;
        await migrate(db);
      } finally {
        await db.query(`SELECT pg_advisory_unlock($1)`, [SCHEMA_LOCK]).catch(() => {});
        db.release();
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

const SCHEMA_LOCK = 72_415_001; // arbitrary app-wide advisory-lock id

async function schemaVersion(db: Queryable): Promise<number> {
  const meta = await db.query<{ version: number }>(`SELECT version FROM schema_meta LIMIT 1`);
  return meta.rows[0]?.version ?? 0;
}

type Queryable = Pick<PoolClient, "query">;

/**
 * Create every table and seed defaults. For a prototype this stands in for a
 * migration tool; each statement is idempotent so it is safe to re-run.
 */
async function migrate(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             SERIAL PRIMARY KEY,
      full_name      TEXT NOT NULL,
      official_email TEXT NOT NULL UNIQUE,
      mobile         TEXT NOT NULL,
      service_id     TEXT NOT NULL,
      designation    TEXT NOT NULL,
      posting        TEXT NOT NULL,
      password_hash  TEXT NOT NULL,
      role           TEXT NOT NULL DEFAULT 'member',
      status         TEXT NOT NULL DEFAULT 'pending',
      avatar_url     TEXT,
      blood_group    TEXT,
      blood_available BOOLEAN NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      approved_at    TIMESTAMPTZ
    )
  `);

  // Migrate existing databases created before these columns existed.
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group TEXT`);
  await db.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_available BOOLEAN NOT NULL DEFAULT false`,
  );
  // Bumped on password change/reset: invalidates every session and reset link.
  await db.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0`,
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id         SERIAL PRIMARY KEY,
      category   TEXT NOT NULL,               -- travel | welfare | condolence | election
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      image_url  TEXT,
      author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Blog-style posts: a short excerpt for cards + ordered content sections.
  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT`);
  // A downloadable PDF (the detailed programme) rendered after the body text.
  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS pdf_url TEXT`);

  // A post can carry a payment intent:
  //   none          — informational only (default)
  //   participation — a fixed fee to join (e.g. a tour); fee_amount is set
  //   donation      — an open contribution; the payer chooses the amount
  // payment_open lets an admin close the button (tour filled / deadline passed).
  await db.query(
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'none'`,
  );
  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12,2)`);
  await db.query(
    `ALTER TABLE posts ADD COLUMN IF NOT EXISTS payment_open BOOLEAN NOT NULL DEFAULT true`,
  );
  await db.query(`
    CREATE TABLE IF NOT EXISTS post_blocks (
      id         SERIAL PRIMARY KEY,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      heading    TEXT,
      body       TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS post_blocks_post_idx ON post_blocks(post_id, sort_order)`,
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS post_images (
      id         SERIAL PRIMARY KEY,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      url        TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  // Images can belong to a section (block_id) or to the post cover (null).
  await db.query(
    `ALTER TABLE post_images ADD COLUMN IF NOT EXISTS block_id INTEGER REFERENCES post_blocks(id) ON DELETE CASCADE`,
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS post_images_post_idx ON post_images(post_id, sort_order)`,
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS post_images_block_idx ON post_images(block_id, sort_order)`,
  );

  // External video links (YouTube/Vimeo/Facebook) shown in the post gallery.
  await db.query(`
    CREATE TABLE IF NOT EXISTS post_videos (
      id         SERIAL PRIMARY KEY,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      url        TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  await db.query(
    `CREATE INDEX IF NOT EXISTS post_videos_post_idx ON post_videos(post_id, sort_order)`,
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS polls (
      id         SERIAL PRIMARY KEY,
      question   TEXT NOT NULL,
      active     BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id      SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      label   TEXT NOT NULL
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS poll_votes (
      id        SERIAL PRIMARY KEY,
      poll_id   INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (poll_id, user_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id          SERIAL PRIMARY KEY,
      kind        TEXT NOT NULL,              -- bkash | nagad | rocket | bank | other
      label       TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      instructions TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      active      BOOLEAN NOT NULL DEFAULT true
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS donations (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      donor_name     TEXT NOT NULL,
      amount         NUMERIC(12,2) NOT NULL,
      method         TEXT NOT NULL,
      transaction_ref TEXT NOT NULL,
      note           TEXT,
      status         TEXT NOT NULL DEFAULT 'reported', -- reported | verified | rejected
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Contributions are now tied to the post they were made against, and carry
  // a kind: 'donation' (open welfare giving) or 'participation' (a tour fee).
  await db.query(
    `ALTER TABLE donations ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL`,
  );
  await db.query(
    `ALTER TABLE donations ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'donation'`,
  );
  // Gateway-ready: a real payment provider (SSLCommerz/bKash PGW) fills these
  // and sets status='verified' automatically; unused while payment is manual.
  await db.query(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS provider TEXT`);
  await db.query(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS gateway_ref TEXT`);
  await db.query(
    `CREATE INDEX IF NOT EXISTS donations_post_idx ON donations(post_id)`,
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,   -- notice | donation | account
      title      TEXT NOT NULL,
      body       TEXT,
      link       TEXT,
      read       BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Notifications record what happened (kind + params) and are rendered in the
  // reader's language; title/body keep English text for older rows.
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind TEXT`);
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS params JSONB`);
  await db.query(
    `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read)`,
  );

  // Only Travel & Tourism posts may carry a payment; clear any older ones.
  await db.query(
    `UPDATE posts SET payment_mode = 'none', fee_amount = NULL
     WHERE category <> 'travel' AND payment_mode <> 'none'`,
  );

  // Login / password-reset attempt counters (see lib/ratelimit.ts).
  await db.query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key          TEXT PRIMARY KEY,
      count        INTEGER NOT NULL,
      window_start TIMESTAMPTZ NOT NULL
    )
  `);
  // Duplicate transaction-reference lookups on payment reports.
  await db.query(
    `CREATE INDEX IF NOT EXISTS donations_txref_idx ON donations (lower(transaction_ref))`,
  );

  
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);
  await db.query(`ALTER TABLE users RENAME COLUMN official_email TO email`).catch(() => {});
  await db.query(`ALTER TABLE users DROP COLUMN IF EXISTS service_id`).catch(() => {});

  // V7 Migrations
  await db.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0`);

  await ensureAdmin(db);
  await seedPaymentMethods(db);
  await seedContent(db);

  // Record the version so later cold starts take the fast path above.
  await db.query(`DELETE FROM schema_meta`);
  await db.query(`INSERT INTO schema_meta (version) VALUES ($1)`, [SCHEMA_VERSION]);
}

async function ensureAdmin(db: Queryable): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const { rowCount } = await db.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
  if (rowCount && rowCount > 0) return;
  const hash = await hashPassword(password);
  await db.query(
    `INSERT INTO users
       (full_name, email, mobile, designation, posting, address, password_hash, role, status, approved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'admin','approved', now())
     ON CONFLICT (email) DO NOTHING`,
    ["Portal Administrator", email.toLowerCase(), "—", "Administrator", "Head Office", "", hash],
  );
}

async function seedPaymentMethods(db: Queryable): Promise<void> {
  const { rowCount } = await db.query("SELECT 1 FROM payment_methods LIMIT 1");
  if (rowCount && rowCount > 0) return;
  const rows: [string, string, string, string, string, number][] = [
    ["bkash", "bKash (Send Money)", "Welfare Fund", "01700-000000", "Send Money to this number, then report your donation below with the TrxID.", 1],
    ["nagad", "Nagad (Send Money)", "Welfare Fund", "01800-000000", "Send Money to this number, then report your donation below with the TxnID.", 2],
    ["rocket", "Rocket", "Welfare Fund", "018000000000-1", "Send to this Rocket number and keep the reference.", 3],
    ["bank", "Bank Transfer", "Officers Welfare Association", "1234 5678 9012", "Bank: Sonali Bank · Branch: Head Office · Routing: 200270015. Use your name as reference.", 4],
  ];
  for (const [kind, label, name, num, ins, order] of rows) {
    await db.query(
      `INSERT INTO payment_methods (kind, label, account_name, account_number, instructions, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [kind, label, name, num, ins, order],
    );
  }
}

async function seedContent(db: Queryable): Promise<void> {
  const { rowCount } = await db.query("SELECT 1 FROM posts LIMIT 1");
  if (!rowCount) {
    // [category, title, body, payment_mode, fee_amount]
    const posts: [string, string, string, string, number | null][] = [
      ["travel", "Winter tour — Bandarban, 3 days", "A departmental tour to the Bandarban hills is being planned for this winter. Families welcome. Reserve your seat below; the fee covers transport, lodging and meals.", "participation", 3000],
      ["welfare", "Support for a colleague's medical treatment", "A serving officer needs assistance for urgent medical treatment. Please contact the association office if you can help.", "none", null],
      ["condolence", "In memory of a retired colleague", "We mourn the passing of a respected retired officer. Our condolences to the family. Details of support for the bereaved family will be posted here.", "none", null],
      ["association", "About the association", "This board carries official association information — the committee, general notices, and neutral election information such as the schedule, voter list and final list of candidates. No personal campaigning is hosted here.", "none", null],
    ];
    for (const [category, title, body, mode, fee] of posts) {
      await db.query(
        `INSERT INTO posts (category, title, body, payment_mode, fee_amount) VALUES ($1,$2,$3,$4,$5)`,
        [category, title, body, mode, fee],
      );
    }
  }
  const { rowCount: pollCount } = await db.query("SELECT 1 FROM polls LIMIT 1");
  if (!pollCount) {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO polls (question) VALUES ($1) RETURNING id`,
      ["Where should the next departmental tour be?"],
    );
    const pollId = rows[0].id;
    for (const label of ["Bandarban", "Sundarbans", "Sylhet tea gardens", "Cox's Bazar"]) {
      await db.query(`INSERT INTO poll_options (poll_id, label) VALUES ($1,$2)`, [pollId, label]);
    }
  }
}

/* ------------------------------- Users --------------------------------- */

const PUBLIC_COLS =
  "id, full_name, email, mobile, designation, posting, address, role, status, avatar_url, blood_group, blood_available, created_at, approved_at, session_version";

export type NewUser = {
  fullName: string;
  email: string;
  mobile: string;
    designation: string;
  posting: string;
  address: string | null;
  passwordHash: string;
};

export class EmailTakenError extends Error {}

export async function createUser(u: NewUser): Promise<number> {
  await ensureSchema();
  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO users
         (full_name, email, mobile, designation, posting, address, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [u.fullName, u.email, u.mobile, u.designation, u.posting, u.address || null, u.passwordHash],
    );
    return rows[0].id;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      throw new EmailTakenError("An account with this email already exists.");
    }
    throw err;
  }
}

export async function getUserByEmail(email: string): Promise<UserWithHash | null> {
  await ensureSchema();
  const { rows } = await pool.query<UserWithHash>(
    `SELECT ${PUBLIC_COLS}, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<User | null> {
  if (!isDbId(id)) return null;
  await ensureSchema();
  const { rows } = await pool.query<User>(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listUsers(status?: UserStatus): Promise<User[]> {
  await ensureSchema();
  const { rows } = status
    ? await pool.query<User>(
        `SELECT ${PUBLIC_COLS} FROM users WHERE status = $1 ORDER BY created_at DESC, id DESC`,
        [status],
      )
    : await pool.query<User>(`SELECT ${PUBLIC_COLS} FROM users ORDER BY created_at DESC, id DESC`);
  return rows;
}

/** Rows per page in the admin member list. */
export const USERS_PER_PAGE = 25;

/**
 * One page of members for the admin list, newest first, optionally narrowed by
 * status and a free-text search over name, email, mobile, service ID,
 * designation and posting.
 */
export async function searchUsers(opts: {
  q?: string;
  status?: UserStatus;
  page?: number;
}): Promise<Paged<User>> {
  await ensureSchema();
  const pattern = likePattern(opts.q);
  const where = `WHERE ($1::text IS NULL OR status = $1)
    AND ($2::text IS NULL OR full_name ILIKE $2 ESCAPE '\\' OR email ILIKE $2 ESCAPE '\\'
         OR mobile ILIKE $2 ESCAPE '\\'          OR designation ILIKE $2 ESCAPE '\\' OR posting ILIKE $2 ESCAPE '\\' OR address ILIKE $2 ESCAPE '\\')`;
  const params = [opts.status ?? null, pattern];
  const { rows: cnt } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM users ${where}`,
    params,
  );
  const total = cnt[0].n;
  const { page, pageCount, offset } = pageWindow(total, opts.page ?? 1, USERS_PER_PAGE);
  const { rows } = await pool.query<User>(
    `SELECT ${PUBLIC_COLS} FROM users ${where} ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4`,
    [...params, USERS_PER_PAGE, offset],
  );
  return { items: rows, total, page, pageCount };
}

export async function listBloodDonors(group?: string): Promise<User[]> {
  await ensureSchema();
  const base = `SELECT ${PUBLIC_COLS} FROM users WHERE status = 'approved' AND blood_available = true AND blood_group IS NOT NULL`;
  const { rows } = group
    ? await pool.query<User>(`${base} AND blood_group = $1 ORDER BY full_name`, [group])
    : await pool.query<User>(`${base} ORDER BY blood_group, full_name`);
  return rows;
}

export async function statusCounts(): Promise<Record<UserStatus | "total", number>> {
  await ensureSchema();
  const { rows } = await pool.query<{ status: UserStatus; n: string }>(
    "SELECT status, count(*)::int AS n FROM users GROUP BY status",
  );
  const out = { total: 0, pending: 0, approved: 0, rejected: 0, blocked: 0 };
  for (const r of rows) {
    out[r.status] = Number(r.n);
    out.total += Number(r.n);
  }
  return out;
}

export async function setUserStatus(id: number, status: UserStatus): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE users SET status = $2,
       approved_at = CASE WHEN $2 = 'approved' THEN now() ELSE approved_at END
     WHERE id = $1`,
    [id, status],
  );
}

export async function setUserRole(id: number, role: UserRole): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE users SET role = $2 WHERE id = $1`, [id, role]);
}

export async function deleteUser(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM users WHERE id = $1 AND role <> 'admin'`, [id]);
}

/**
 * Set a new password and bump the session version, which signs out every
 * existing session and voids any outstanding reset link. Only applies while the
 * row is still at `expectedVersion`, so a reset link can't be used twice even
 * concurrently. Returns whether the password changed.
 */
export async function setPassword(
  id: number,
  passwordHash: string,
  expectedVersion: number,
): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await pool.query(
    `UPDATE users SET password_hash = $2, session_version = session_version + 1
     WHERE id = $1 AND session_version = $3`,
    [id, passwordHash, expectedVersion],
  );
  return (rowCount ?? 0) > 0;
}

export type ProfileUpdate = {
  mobile: string;
  designation: string;
  posting: string;
  address: string;
  bloodGroup: string | null;
  bloodAvailable: boolean;
  avatarUrl?: string | null;
};

export async function updateProfile(id: number, p: ProfileUpdate): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE users SET mobile=$2, designation=$3, posting=$4, address=$5, blood_group=$6, blood_available=$7,
       avatar_url = COALESCE($8, avatar_url)
     WHERE id = $1`,
    [id, p.mobile, p.designation, p.posting, p.address, p.bloodGroup, p.bloodAvailable, p.avatarUrl ?? null],
  );
}
