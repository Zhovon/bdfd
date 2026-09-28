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
 * Uploads go to Cloudflare R2 (S3-compatible) when it's configured; otherwise
 * they fall back to local disk so `npm run dev` works with no cloud account.
 * The five R2_* vars must all be set to enable object storage.
 */
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
const r2Configured = Boolean(
  R2_BUCKET &&
    R2_PUBLIC_URL &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY,
);

let _r2: S3Client | null = null;
function r2(): S3Client {
  if (!_r2) {
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2;
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

  // Production: object storage (works on Vercel's read-only filesystem).
  if (r2Configured) {
    const key = `uploads/${filename}`;
    await r2().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: CONTENT_TYPE[ext] ?? "application/octet-stream",
      }),
    );
    return `${R2_PUBLIC_URL}/${key}`;
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
