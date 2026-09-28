import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB per image
const PDF_MAX_BYTES = 15 * 1024 * 1024; // 15 MB per PDF
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
      forcePathStyle: true, // required by Supabase Storage, fine for R2/S3
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

/** Write a file to object storage (prod) or /public/uploads (dev fallback). */
async function store(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const key = `uploads/${filename}`;
  if (s3Configured) {
    await s3().send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: contentType }),
    );
    return `${S3_PUBLIC_URL}/${key}`;
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
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
  return store(buffer, `${basename}.${ext}`, CONTENT_TYPE[ext] ?? "application/octet-stream");
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

/**
 * Save an uploaded PDF and return its public URL. Returns null when no file was
 * provided; throws on an oversized/non-PDF file.
 */
export async function savePdf(
  file: FormDataEntryValue | null,
  basename: string,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > PDF_MAX_BYTES) throw new Error("PDF must be under 15 MB.");

  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext !== "pdf") throw new Error("Upload a PDF file.");

  const buffer = Buffer.from(await file.arrayBuffer());
  return store(buffer, `${basename}.pdf`, "application/pdf");
}
