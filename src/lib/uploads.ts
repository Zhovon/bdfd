import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * Uploads go to any S3-compatible object store (Supabase Storage, Cloudflare R2,
 * Backblaze B2, AWS S3…) when it's configured; otherwise they fall back to local
 * disk so `npm run dev` works with no cloud account. Switch providers by changing
 * env vars only — no code change.
 *
 *   S3_ENDPOINT           e.g. https://<ref>.storage.supabase.co/storage/v1/s3
 *                          or   https://<account>.r2.cloudflarestorage.com
 *   S3_REGION             provider region (Supabase: its project region; R2: auto)
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_BUCKET
 *   S3_PUBLIC_URL         public base for reads, e.g.
 *                          https://<ref>.supabase.co/storage/v1/object/public/<bucket>
 */
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL?.replace(/\/+$/, "");
const s3Configured = Boolean(
  S3_BUCKET &&
    S3_ENDPOINT &&
    S3_PUBLIC_URL &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
);

let _s3: S3Client | null = null;
function s3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: S3_ENDPOINT,
      // Path-style addressing — required by Supabase Storage, and fine for R2/S3.
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

/**
 * Save an uploaded image and return its public URL. Returns null when no file
 * was provided; throws on an oversized/invalid file.
 */
export async function saveUpload(
  file: FormDataEntryValue | null,
  basename: string,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("Image must be under 4 MB.");

  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED.has(ext)) throw new Error("Use a JPG, PNG, WebP, GIF or AVIF image.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${basename}.${ext}`;

  // Production: object storage (works on read-only serverless filesystems).
  if (s3Configured) {
    const key = `uploads/${filename}`;
    await s3().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: CONTENT_TYPE[ext] ?? "application/octet-stream",
      }),
    );
    return `${S3_PUBLIC_URL}/${key}`;
  }

  // Local dev fallback: write to /public/uploads.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

/**
 * Save several uploaded images, skipping empty/invalid ones. Returns the URLs of
 * the ones that saved, in order. Caps the count to keep a gallery reasonable.
 */
export async function saveUploads(
  files: FormDataEntryValue[],
  basePrefix: string,
  max = 12,
): Promise<string[]> {
  const urls: string[] = [];
  let n = 0;
  for (const file of files) {
    if (urls.length >= max) break;
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      const url = await saveUpload(file, `${basePrefix}-${n++}`);
      if (url) urls.push(url);
    } catch (err) {
      // Skip an invalid/oversized image rather than failing the whole post.
      console.warn("gallery image skipped:", err instanceof Error ? err.message : err);
    }
  }
  return urls;
}
