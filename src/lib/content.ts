import "server-only";
import { pool, ensureSchema } from "@/lib/db";

export type PostCategory = "travel" | "welfare" | "condolence" | "association";

/**
 * A post can carry a payment intent:
 *  - none          informational only
 *  - participation a fixed fee to join (tours); feeAmount is set
 *  - donation      an open contribution; the payer chooses the amount
 */
export type PaymentMode = "none" | "participation" | "donation";

type PostRow = {
  id: number;
  category: PostCategory;
  title: string;
  body: string;
  excerpt: string | null;
  image_url: string | null;
  pdf_url: string | null;
  payment_mode: PaymentMode;
  fee_amount: string | null; // NUMERIC comes back as string from pg
  payment_open: boolean;
  created_at: Date;
};

/** Payment intent flattened for the UI (shared by card + detail views). */
export type PostPayment = {
  paymentMode: PaymentMode;
  feeAmount: number | null;
  paymentOpen: boolean;
};

/** A card summary for board lists. */
export type PostCard = PostPayment & {
  id: number;
  category: PostCategory;
  title: string;
  excerpt: string;
  cover: string | null;
  photoCount: number;
  hasVideo: boolean;
  hasPdf: boolean;
  created_at: Date;
};

export type PostBlock = { id: number; heading: string | null; body: string; images: string[] };

/** Full post for the detail page. */
export type Post = PostPayment & {
  id: number;
  category: PostCategory;
  title: string;
  body: string;
  excerpt: string;
  cover: string[]; // cover gallery (images not tied to a section)
  blocks: PostBlock[];
  videos: string[]; // external video links (YouTube/Vimeo/Facebook)
  pdfUrl: string | null; // downloadable programme PDF
  created_at: Date;
};

const excerptOf = (r: PostRow) => (r.excerpt?.trim() || r.body || "").slice(0, 200);

/** Flatten a row's payment columns into the UI shape. */
const paymentOf = (r: PostRow): PostPayment => ({
  paymentMode: r.payment_mode,
  feeAmount: r.fee_amount === null ? null : Number(r.fee_amount),
  paymentOpen: r.payment_open,
});

/** The post columns every read needs (keeps SELECTs in sync). */
const POST_COLS =
  "id, category, title, body, excerpt, image_url, pdf_url, payment_mode, fee_amount, payment_open, created_at";

/** Cover images = post_images with no block_id; falls back to legacy image_url. */
async function coverImages(postIds: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (postIds.length === 0) return map;
  const { rows } = await pool.query<{ post_id: number; url: string }>(
    `SELECT post_id, url FROM post_images
     WHERE post_id = ANY($1::int[]) AND block_id IS NULL ORDER BY post_id, sort_order, id`,
    [postIds],
  );
  for (const r of rows) {
    const arr = map.get(r.post_id) ?? [];
    arr.push(r.url);
    map.set(r.post_id, arr);
  }
  return map;
}

/** Which of the given posts have at least one video link. */
async function videoPostIds(postIds: number[]): Promise<Set<number>> {
  if (postIds.length === 0) return new Set();
  const { rows } = await pool.query<{ post_id: number }>(
    `SELECT DISTINCT post_id FROM post_videos WHERE post_id = ANY($1::int[])`,
    [postIds],
  );
  return new Set(rows.map((r) => r.post_id));
}

async function toCards(rows: PostRow[]): Promise<PostCard[]> {
  const ids = rows.map((r) => r.id);
  const [covers, withVideo] = await Promise.all([coverImages(ids), videoPostIds(ids)]);
  return rows.map((r) => {
    const imgs = covers.get(r.id) ?? (r.image_url ? [r.image_url] : []);
    return {
      id: r.id,
      category: r.category,
      title: r.title,
      excerpt: excerptOf(r),
      cover: imgs[0] ?? null,
      photoCount: imgs.length,
      hasVideo: withVideo.has(r.id),
      hasPdf: !!r.pdf_url,
      created_at: r.created_at,
      ...paymentOf(r),
    };
  });
}

export async function listPosts(category: PostCategory): Promise<PostCard[]> {
  await ensureSchema();
  const { rows } = await pool.query<PostRow>(
    `SELECT ${POST_COLS} FROM posts WHERE category = $1 ORDER BY created_at DESC, id DESC`,
    [category],
  );
  return toCards(rows);
}

export async function listAllPosts(): Promise<PostCard[]> {
  await ensureSchema();
  const { rows } = await pool.query<PostRow>(
    `SELECT ${POST_COLS} FROM posts ORDER BY created_at DESC, id DESC`,
  );
  return toCards(rows);
}

/** Full post with its sections and per-section galleries. */
export async function getPost(id: number): Promise<Post | null> {
  await ensureSchema();
  const { rows } = await pool.query<PostRow>(
    `SELECT ${POST_COLS} FROM posts WHERE id = $1`,
    [id],
  );
  const p = rows[0];
  if (!p) return null;

  const { rows: imgs } = await pool.query<{ url: string; block_id: number | null }>(
    `SELECT url, block_id FROM post_images WHERE post_id = $1 ORDER BY sort_order, id`,
    [id],
  );
  const cover = imgs.filter((i) => i.block_id === null).map((i) => i.url);
  const coverFallback = cover.length === 0 && p.image_url ? [p.image_url] : cover;

  const { rows: blockRows } = await pool.query<{ id: number; heading: string | null; body: string }>(
    `SELECT id, heading, body FROM post_blocks WHERE post_id = $1 ORDER BY sort_order, id`,
    [id],
  );
  const blocks: PostBlock[] = blockRows.map((b) => ({
    id: b.id,
    heading: b.heading,
    body: b.body,
    images: imgs.filter((i) => i.block_id === b.id).map((i) => i.url),
  }));

  const { rows: vids } = await pool.query<{ url: string }>(
    `SELECT url FROM post_videos WHERE post_id = $1 ORDER BY sort_order, id`,
    [id],
  );

  return {
    id: p.id,
    category: p.category,
    title: p.title,
    body: p.body,
    excerpt: excerptOf(p),
    cover: coverFallback,
    blocks,
    videos: vids.map((v) => v.url),
    pdfUrl: p.pdf_url,
    created_at: p.created_at,
    ...paymentOf(p),
  };
}

export type NewPost = {
  category: PostCategory;
  title: string;
  excerpt: string;
  authorId: number;
  cover: string[];
  blocks: { heading: string; body: string; images: string[] }[];
  videos: string[];
  pdfUrl: string | null;
  paymentMode: PaymentMode;
  feeAmount: number | null;
};

export async function createPost(input: NewPost): Promise<number> {
  await ensureSchema();
  // A participation post keeps its fee; other modes never carry one.
  const fee = input.paymentMode === "participation" ? input.feeAmount : null;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO posts (category, title, body, excerpt, author_id, image_url, pdf_url, payment_mode, fee_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [input.category, input.title, "", input.excerpt, input.authorId, input.cover[0] ?? null, input.pdfUrl, input.paymentMode, fee],
  );
  const postId = rows[0].id;

  for (let i = 0; i < input.videos.length; i++) {
    await pool.query(`INSERT INTO post_videos (post_id, url, sort_order) VALUES ($1,$2,$3)`, [
      postId,
      input.videos[i],
      i,
    ]);
  }

  for (let i = 0; i < input.cover.length; i++) {
    await pool.query(
      `INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES ($1,$2,$3,NULL)`,
      [postId, input.cover[i], i],
    );
  }

  for (let bi = 0; bi < input.blocks.length; bi++) {
    const blk = input.blocks[bi];
    const { rows: br } = await pool.query<{ id: number }>(
      `INSERT INTO post_blocks (post_id, heading, body, sort_order) VALUES ($1,$2,$3,$4) RETURNING id`,
      [postId, blk.heading || null, blk.body, bi],
    );
    const blockId = br[0].id;
    for (let ii = 0; ii < blk.images.length; ii++) {
      await pool.query(
        `INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES ($1,$2,$3,$4)`,
        [postId, blk.images[ii], ii, blockId],
      );
    }
  }
  return postId;
}

export async function deletePost(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM posts WHERE id = $1`, [id]);
}

/* --------------------------------- Polls -------------------------------- */

export type PollResult = {
  id: number;
  question: string;
  active: boolean;
  created_at: Date;
  options: { id: number; label: string; votes: number }[];
  totalVotes: number;
};

type PollRow = { id: number; question: string; active: boolean; created_at: Date };

export async function getActivePoll(): Promise<PollResult | null> {
  await ensureSchema();
  const { rows } = await pool.query<PollRow>(
    `SELECT id, question, active, created_at FROM polls WHERE active = true ORDER BY created_at DESC LIMIT 1`,
  );
  if (rows.length === 0) return null;
  return buildResult(rows[0]);
}

/** Every poll, newest first, each with tallied results. */
export async function listPolls(): Promise<PollResult[]> {
  await ensureSchema();
  const { rows } = await pool.query<PollRow>(
    `SELECT id, question, active, created_at FROM polls ORDER BY active DESC, created_at DESC`,
  );
  return Promise.all(rows.map(buildResult));
}

/** Closed polls only (results archive shown to members). */
export async function listClosedPolls(): Promise<PollResult[]> {
  await ensureSchema();
  const { rows } = await pool.query<PollRow>(
    `SELECT id, question, active, created_at FROM polls WHERE active = false ORDER BY created_at DESC`,
  );
  return Promise.all(rows.map(buildResult));
}

async function buildResult(p: PollRow): Promise<PollResult> {
  const { rows: options } = await pool.query<{ id: number; label: string; votes: string }>(
    `SELECT o.id, o.label, count(v.id)::int AS votes
     FROM poll_options o
     LEFT JOIN poll_votes v ON v.option_id = o.id
     WHERE o.poll_id = $1
     GROUP BY o.id, o.label ORDER BY o.id`,
    [p.id],
  );
  const opts = options.map((o) => ({ id: o.id, label: o.label, votes: Number(o.votes) }));
  return {
    id: p.id,
    question: p.question,
    active: p.active,
    created_at: p.created_at,
    options: opts,
    totalVotes: opts.reduce((s, o) => s + o.votes, 0),
  };
}

export async function getUserVote(pollId: number, userId: number): Promise<number | null> {
  await ensureSchema();
  const { rows } = await pool.query<{ option_id: number }>(
    `SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
    [pollId, userId],
  );
  return rows[0]?.option_id ?? null;
}

/** Which option the user chose in each of the given polls (pollId -> optionId). */
export async function getUserVotes(pollIds: number[], userId: number): Promise<Record<number, number>> {
  await ensureSchema();
  if (pollIds.length === 0) return {};
  const { rows } = await pool.query<{ poll_id: number; option_id: number }>(
    `SELECT poll_id, option_id FROM poll_votes WHERE user_id = $1 AND poll_id = ANY($2::int[])`,
    [userId, pollIds],
  );
  return Object.fromEntries(rows.map((r) => [r.poll_id, r.option_id]));
}

/** One vote per user per poll; ignores duplicates. */
export async function castVote(pollId: number, optionId: number, userId: number): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)
     ON CONFLICT (poll_id, user_id) DO NOTHING`,
    [pollId, optionId, userId],
  );
}

export async function createPoll(question: string, options: string[]): Promise<void> {
  await ensureSchema();
  // Creating a new poll closes the current one — but the closed poll and its
  // votes are kept, and its results stay viewable in the archive.
  await pool.query(`UPDATE polls SET active = false WHERE active = true`);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO polls (question) VALUES ($1) RETURNING id`,
    [question],
  );
  for (const label of options) {
    await pool.query(`INSERT INTO poll_options (poll_id, label) VALUES ($1,$2)`, [rows[0].id, label]);
  }
}

/** Close the currently-open poll without starting a new one. */
export async function closePoll(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE polls SET active = false WHERE id = $1`, [id]);
}

/** Reopen a closed poll, closing any other open poll first. */
export async function reopenPoll(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE polls SET active = false WHERE active = true`);
  await pool.query(`UPDATE polls SET active = true WHERE id = $1`, [id]);
}

/** Permanently delete a poll and its votes. */
export async function deletePoll(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM polls WHERE id = $1`, [id]);
}
