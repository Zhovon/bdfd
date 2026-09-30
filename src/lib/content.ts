import "server-only";
import type { PoolClient } from "pg";
import { pool, ensureSchema, isDbId, withTransaction } from "@/lib/db";
import { pageWindow, type Paged } from "@/lib/paging";

export type PostCategory = "travel" | "welfare" | "condolence" | "association" | "transfer" | "portal_info";

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

/** Only Travel & Tourism notices take payments (a tour fee or a donation). */
export const acceptsPayment = (p: { category: PostCategory; paymentMode: PaymentMode }) =>
  p.category === "travel" && p.paymentMode !== "none";

/** Notice cards per page on the board + admin lists. */
export const POSTS_PER_PAGE = 9;

export type { Paged } from "@/lib/paging";

/**
 * One page of post cards. Runs a cheap COUNT first so the page is always
 * clamped into range, then fetches only that window — never the whole table.
 * `where` is a fixed internal clause (not user input); LIMIT/OFFSET are bound.
 */
async function pagePosts(where: string, params: unknown[], page: number): Promise<Paged<PostCard>> {
  await ensureSchema();
  const { rows: cnt } = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM posts ${where}`,
    params,
  );
  const total = Number(cnt[0].total);
  const { page: current, pageCount, offset } = pageWindow(total, page, POSTS_PER_PAGE);
  const { rows } = await pool.query<PostRow>(
    `SELECT ${POST_COLS} FROM posts ${where}
     ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, POSTS_PER_PAGE, offset],
  );
  return { items: await toCards(rows), total, page: current, pageCount };
}

export function listPostsPaged(category: PostCategory, page: number): Promise<Paged<PostCard>> {
  return pagePosts(`WHERE category = $1`, [category], page);
}

export function listAllPostsPaged(page: number): Promise<Paged<PostCard>> {
  return pagePosts(``, [], page);
}

/** Total post count, optionally scoped to a board — for dashboard stat tiles. */
export async function countPosts(category?: PostCategory): Promise<number> {
  await ensureSchema();
  const { rows } = category
    ? await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM posts WHERE category = $1`,
        [category],
      )
    : await pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM posts`);
  return Number(rows[0].count);
}

/** The newest `limit` posts as cards — for the dashboard preview. */
export async function latestPosts(limit: number): Promise<PostCard[]> {
  await ensureSchema();
  const { rows } = await pool.query<PostRow>(
    `SELECT ${POST_COLS} FROM posts ORDER BY created_at DESC, id DESC LIMIT $1`,
    [limit],
  );
  return toCards(rows);
}

/** Full post with its sections and per-section galleries. */
export async function getPost(id: number): Promise<Post | null> {
  if (!isDbId(id)) return null;
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
  return withTransaction((db) => insertPost(db, input));
}

async function insertPost(db: PoolClient, input: NewPost): Promise<number> {
  // A participation post keeps its fee; other modes never carry one.
  const fee = input.paymentMode === "participation" ? input.feeAmount : null;
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO posts (category, title, body, excerpt, author_id, image_url, pdf_url, payment_mode, fee_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [input.category, input.title, "", input.excerpt, input.authorId, input.cover[0] ?? null, input.pdfUrl, input.paymentMode, fee],
  );
  const postId = rows[0].id;

  for (let i = 0; i < input.videos.length; i++) {
    await db.query(`INSERT INTO post_videos (post_id, url, sort_order) VALUES ($1,$2,$3)`, [
      postId,
      input.videos[i],
      i,
    ]);
  }

  for (let i = 0; i < input.cover.length; i++) {
    await db.query(
      `INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES ($1,$2,$3,NULL)`,
      [postId, input.cover[i], i],
    );
  }

  for (let bi = 0; bi < input.blocks.length; bi++) {
    const blk = input.blocks[bi];
    const { rows: br } = await db.query<{ id: number }>(
      `INSERT INTO post_blocks (post_id, heading, body, sort_order) VALUES ($1,$2,$3,$4) RETURNING id`,
      [postId, blk.heading || null, blk.body, bi],
    );
    const blockId = br[0].id;
    for (let ii = 0; ii < blk.images.length; ii++) {
      await db.query(
        `INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES ($1,$2,$3,$4)`,
        [postId, blk.images[ii], ii, blockId],
      );
    }
  }
  return postId;
}

/** Delete a post. Returns the URLs of its stored files so the caller can remove them. */
export async function deletePost(id: number): Promise<string[]> {
  if (!isDbId(id)) return [];
  await ensureSchema();
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ url: string | null }>(
      `SELECT url FROM post_images WHERE post_id = $1
       UNION SELECT image_url FROM posts WHERE id = $1
       UNION SELECT pdf_url FROM posts WHERE id = $1`,
      [id],
    );
    await db.query(`DELETE FROM posts WHERE id = $1`, [id]);
    return rows.map((r) => r.url).filter((u): u is string => Boolean(u));
  });
}

export type ImageRef = { id: number; url: string };

export type PostEditData = PostPayment & {
  id: number;
  category: PostCategory;
  title: string;
  excerpt: string;
  videos: string[];
  pdfUrl: string | null;
  cover: ImageRef[];
  blocks: { id: number; heading: string; body: string; images: ImageRef[] }[];
};

/** A post shaped for the editor: cover + per-section images carry their ids. */
export async function getPostForEdit(id: number): Promise<PostEditData | null> {
  if (!isDbId(id)) return null;
  await ensureSchema();
  const { rows } = await pool.query<PostRow>(`SELECT ${POST_COLS} FROM posts WHERE id = $1`, [id]);
  const p = rows[0];
  if (!p) return null;

  const { rows: imgs } = await pool.query<{ id: number; url: string; block_id: number | null }>(
    `SELECT id, url, block_id FROM post_images WHERE post_id = $1 ORDER BY sort_order, id`,
    [id],
  );
  const { rows: blockRows } = await pool.query<{ id: number; heading: string | null; body: string }>(
    `SELECT id, heading, body FROM post_blocks WHERE post_id = $1 ORDER BY sort_order, id`,
    [id],
  );
  const { rows: vids } = await pool.query<{ url: string }>(
    `SELECT url FROM post_videos WHERE post_id = $1 ORDER BY sort_order, id`,
    [id],
  );

  return {
    id: p.id,
    category: p.category,
    title: p.title,
    excerpt: p.excerpt ?? "", // raw excerpt for editing (not the computed one)
    videos: vids.map((v) => v.url),
    pdfUrl: p.pdf_url,
    ...paymentOf(p),
    cover: imgs.filter((i) => i.block_id === null).map((i) => ({ id: i.id, url: i.url })),
    blocks: blockRows.map((b) => ({
      id: b.id,
      heading: b.heading ?? "",
      body: b.body,
      images: imgs.filter((i) => i.block_id === b.id).map((i) => ({ id: i.id, url: i.url })),
    })),
  };
}

export type EditPost = {
  category: PostCategory;
  title: string;
  excerpt: string;
  newCover: string[]; // newly uploaded cover photos to append
  removeImageIds: number[]; // existing image ids to delete (cover or section)
  // Sections in display order. A block with an id already exists (update it in
  // place so its images survive); a null id is a brand-new section to insert.
  blocks: { id: number | null; heading: string; body: string; newImages: string[] }[];
  videos: string[];
  newPdfUrl: string | null; // replacement PDF, if uploaded
  removePdf: boolean;
  paymentMode: PaymentMode;
  feeAmount: number | null;
};

/** Append image urls to a group (cover = null block, or a section) after its
 * current highest sort_order, so new uploads land after existing ones. */
async function appendImages(
  db: PoolClient,
  postId: number,
  blockId: number | null,
  urls: string[],
): Promise<void> {
  if (urls.length === 0) return;
  // IS NOT DISTINCT FROM matches NULL (the cover group) as well as a section id.
  const { rows } = await db.query<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM post_images
     WHERE post_id = $1 AND block_id IS NOT DISTINCT FROM $2::int`,
    [postId, blockId],
  );
  let order = (rows[0]?.max ?? -1) + 1;
  for (const url of urls) {
    await db.query(
      `INSERT INTO post_images (post_id, url, sort_order, block_id) VALUES ($1,$2,$3,$4)`,
      [postId, url, order++, blockId],
    );
  }
}

/** Apply an edit. Returns the URLs of files it dropped so the caller can remove them. */
export async function updatePost(id: number, input: EditPost): Promise<string[]> {
  await ensureSchema();
  return withTransaction((db) => applyPostEdit(db, id, input));
}

async function applyPostEdit(db: PoolClient, id: number, input: EditPost): Promise<string[]> {
  const fee = input.paymentMode === "participation" ? input.feeAmount : null;
  const dropped: string[] = [];

  // Remove images (cover or section) the editor ticked for deletion.
  if (input.removeImageIds.length > 0) {
    const { rows } = await db.query<{ url: string }>(
      `DELETE FROM post_images WHERE post_id = $1 AND id = ANY($2::int[]) RETURNING url`,
      [id, input.removeImageIds],
    );
    dropped.push(...rows.map((r) => r.url));
  }

  // Drop sections the editor removed; their images cascade away with them.
  // Everything still present keeps its id (and thus its images) through the edit.
  const keepIds = input.blocks.map((b) => b.id).filter((x): x is number => x !== null);
  const { rows: orphaned } = await db.query<{ url: string }>(
    `SELECT i.url FROM post_images i JOIN post_blocks b ON b.id = i.block_id
     WHERE b.post_id = $1 AND b.id <> ALL($2::int[])`,
    [id, keepIds],
  );
  dropped.push(...orphaned.map((r) => r.url));
  await db.query(`DELETE FROM post_blocks WHERE post_id = $1 AND id <> ALL($2::int[])`, [
    id,
    keepIds,
  ]);

  // Upsert each surviving/new section in display order, then append its uploads.
  for (let i = 0; i < input.blocks.length; i++) {
    const b = input.blocks[i];
    let blockId: number;
    if (b.id !== null) {
      await db.query(
        `UPDATE post_blocks SET heading=$2, body=$3, sort_order=$4 WHERE id=$1 AND post_id=$5`,
        [b.id, b.heading || null, b.body, i, id],
      );
      blockId = b.id;
    } else {
      const { rows: br } = await db.query<{ id: number }>(
        `INSERT INTO post_blocks (post_id, heading, body, sort_order) VALUES ($1,$2,$3,$4) RETURNING id`,
        [id, b.heading || null, b.body, i],
      );
      blockId = br[0].id;
    }
    await appendImages(db, id, blockId, b.newImages);
  }

  // Append newly uploaded cover photos after the existing ones.
  await appendImages(db, id, null, input.newCover);

  // PDF: replace if a new one was uploaded, else clear if removed, else keep.
  if (input.newPdfUrl || input.removePdf) {
    const { rows } = await db.query<{ pdf_url: string | null }>(
      `SELECT pdf_url FROM posts WHERE id = $1`,
      [id],
    );
    if (rows[0]?.pdf_url) dropped.push(rows[0].pdf_url);
  }
  if (input.newPdfUrl) {
    await db.query(`UPDATE posts SET pdf_url = $2 WHERE id = $1`, [id, input.newPdfUrl]);
  } else if (input.removePdf) {
    await db.query(`UPDATE posts SET pdf_url = NULL WHERE id = $1`, [id]);
  }

  // Core fields + the card thumbnail (first remaining cover image).
  const { rows: firstImg } = await db.query<{ url: string }>(
    `SELECT url FROM post_images WHERE post_id = $1 AND block_id IS NULL ORDER BY sort_order, id LIMIT 1`,
    [id],
  );
  await db.query(
    `UPDATE posts SET category=$2, title=$3, excerpt=$4, image_url=$5, payment_mode=$6, fee_amount=$7 WHERE id=$1`,
    [id, input.category, input.title, input.excerpt, firstImg[0]?.url ?? null, input.paymentMode, fee],
  );

  // Replace video links.
  await db.query(`DELETE FROM post_videos WHERE post_id = $1`, [id]);
  for (let i = 0; i < input.videos.length; i++) {
    await db.query(`INSERT INTO post_videos (post_id, url, sort_order) VALUES ($1,$2,$3)`, [
      id,
      input.videos[i],
      i,
    ]);
  }
  return dropped;
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

/**
 * One vote per user per poll; ignores duplicates. The option must belong to that
 * poll and the poll must still be open — anything else is silently dropped.
 */
export async function castVote(pollId: number, optionId: number, userId: number): Promise<void> {
  if (!isDbId(pollId) || !isDbId(optionId)) return;
  await ensureSchema();
  await pool.query(
    `INSERT INTO poll_votes (poll_id, option_id, user_id)
     SELECT o.poll_id, o.id, $3
     FROM poll_options o JOIN polls p ON p.id = o.poll_id
     WHERE o.id = $2 AND o.poll_id = $1 AND p.active
     ON CONFLICT (poll_id, user_id) DO NOTHING`,
    [pollId, optionId, userId],
  );
}

export async function createPoll(question: string, options: string[]): Promise<void> {
  await ensureSchema();
  // Creating a new poll closes the current one — but the closed poll and its
  // votes are kept, and its results stay viewable in the archive.
  await withTransaction(async (db) => {
    await db.query(`UPDATE polls SET active = false WHERE active = true`);
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO polls (question) VALUES ($1) RETURNING id`,
      [question],
    );
    for (const label of options) {
      await db.query(`INSERT INTO poll_options (poll_id, label) VALUES ($1,$2)`, [rows[0].id, label]);
    }
  });
}

/** Close the currently-open poll without starting a new one. */
export async function closePoll(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE polls SET active = false WHERE id = $1`, [id]);
}

/** Reopen a closed poll, closing any other open poll first. */
export async function reopenPoll(id: number): Promise<void> {
  await ensureSchema();
  if (!isDbId(id)) return;
  await withTransaction(async (db) => {
    await db.query(`UPDATE polls SET active = false WHERE active = true`);
    await db.query(`UPDATE polls SET active = true WHERE id = $1`, [id]);
  });
}

/** Permanently delete a poll and its votes. */
export async function deletePoll(id: number): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM polls WHERE id = $1`, [id]);
}

export type GalleryImage = {
  url: string;
  postId: number;
  postTitle: string;
  postCategory: PostCategory;
  createdAt: Date;
};

export async function getGalleryImagesPaged(page: number): Promise<Paged<GalleryImage>> {
  await ensureSchema();
  const perPage = 24; // 24 images per page
  const { rows: cnt } = await pool.query<{ total: number }>(`
    WITH all_images AS (
      SELECT i.post_id, i.url
      FROM post_images i
      UNION
      SELECT p.id AS post_id, p.image_url AS url
      FROM posts p
      WHERE p.image_url IS NOT NULL
    )
    SELECT COUNT(*)::int AS total FROM all_images
  `);
  
  const total = Number(cnt[0].total);
  const { page: current, pageCount, offset } = pageWindow(total, page, perPage);

  const { rows } = await pool.query<{ post_id: number; title: string; category: string; created_at: Date; url: string }>(`
    WITH all_images AS (
      SELECT p.id AS post_id, p.title, p.category, p.created_at, i.url
      FROM post_images i
      JOIN posts p ON p.id = i.post_id
      UNION
      SELECT p.id AS post_id, p.title, p.category, p.created_at, p.image_url AS url
      FROM posts p
      WHERE p.image_url IS NOT NULL
    )
    SELECT post_id, title, category, created_at, url FROM all_images
    ORDER BY created_at DESC, url ASC
    LIMIT $1 OFFSET $2
  `, [perPage, offset]);

  return {
    items: rows.map(r => ({
      url: r.url,
      postId: r.post_id,
      postTitle: r.title,
      postCategory: r.category as PostCategory,
      createdAt: r.created_at
    })),
    total,
    page: current,
    pageCount
  };
}
