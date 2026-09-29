import "server-only";
import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { processImage } from "@/lib/images";
import { thumbUrl } from "@/lib/media";

// Photos are normally shrunk in the browser before upload; this is the ceiling
// for when that step is skipped. Every image is re-encoded smaller on arrival.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per image
const PDF_MAX_BYTES = 15 * 1024 * 1024; // 15 MB per PDF

export const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  pdf: "application/pdf",
};

/** A rejected upload; `code` names the dictionary message to show (t.msg[code]). */
export class UploadError extends Error {
  constructor(public code: "imageTooBig" | "imageType" | "pdfTooBig" | "pdfType") {
    super(code);
  }
}

/**
 * The real file type, read from its first bytes — never trusted from the file
 * name, so a renamed HTML/script file can't be stored as an "image".
 */
function sniff(buf: Buffer): keyof typeof CONTENT_TYPE | null {
  const ascii = (start: number, end: number) => buf.subarray(start, end).toString("latin1");
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "png";
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  if (ascii(0, 5) === "%PDF-") return "pdf";
  return null;
}

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

/**
 * Local-disk fallback directory. Kept outside /public because a production
 * server only serves files that existed in /public at build time; files here
 * are served by the /uploads/[file] route instead.
 */
export const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
/** Where uploads were written before LOCAL_UPLOAD_DIR existed (dev only). */
export const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** A stored file name: letters, digits, dot, dash, underscore — nothing path-like. */
export const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

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

/** Write a file to object storage (prod) or the local upload dir (dev fallback). */
async function store(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const key = `uploads/${filename}`;
  if (s3Configured) {
    await s3().send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: contentType }),
    );
    return `${S3_PUBLIC_URL}/${key}`;
  }
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

/** Unguessable suffix so upload URLs can't be enumerated from ids/timestamps. */
const nonce = () => randomBytes(6).toString("hex");

/**
 * Save an uploaded image and return its public URL. The photo is re-encoded
 * (rotated upright, resized, metadata stripped) and stored with a thumbnail;
 * see lib/media.ts for the naming. Returns null when no file was provided;
 * throws an UploadError on an oversized or invalid file.
 */
export async function saveUpload(
  file: FormDataEntryValue | null,
  basename: string,
  options: { avatar?: boolean } = {},
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new UploadError("imageTooBig");

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniff(buffer);
  if (!type || type === "pdf") throw new UploadError("imageType");

  let processed;
  try {
    processed = await processImage(buffer, options);
  } catch {
    // Right magic bytes but undecodable (truncated/corrupt, or over the pixel cap).
    throw new UploadError("imageType");
  }
  const name = `${basename}-${nonce()}`;
  const [full] = await Promise.all([
    store(processed.full, `${name}.f.webp`, CONTENT_TYPE.webp),
    store(processed.thumb, `${name}.t.webp`, CONTENT_TYPE.webp),
  ]);
  return full;
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
  if (file.size > PDF_MAX_BYTES) throw new UploadError("pdfTooBig");

  const buffer = Buffer.from(await file.arrayBuffer());
  if (sniff(buffer) !== "pdf") throw new UploadError("pdfType");
  return store(buffer, `${basename}-${nonce()}.pdf`, CONTENT_TYPE.pdf);
}

/**
 * Delete stored files by their public URL. Only touches files this app stored
 * (its bucket prefix or /uploads/); anything else — e.g. an external image
 * link — is ignored. Never throws: a leftover file is logged, not fatal.
 */
export async function deleteUploads(urls: (string | null | undefined)[]): Promise<void> {
  // A photo's thumbnail goes with it.
  const all = urls.filter((u): u is string => Boolean(u)).flatMap((u) => [u, thumbUrl(u)]);
  for (const url of new Set(all)) {
    try {
      if (S3_PUBLIC_URL && url.startsWith(`${S3_PUBLIC_URL}/uploads/`) && s3Configured) {
        const key = url.slice(S3_PUBLIC_URL.length + 1);
        await s3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      } else if (url.startsWith("/uploads/")) {
        const name = url.slice("/uploads/".length);
        if (!SAFE_NAME.test(name)) continue;
        for (const dir of [LOCAL_UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
          await unlink(path.join(dir, name)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("couldn't delete upload:", url, err instanceof Error ? err.message : err);
    }
  }
}

/** Read a locally stored upload (for the /uploads route), or null if absent. */
export async function readLocalUpload(name: string): Promise<{ body: Buffer; type: string } | null> {
  if (!SAFE_NAME.test(name)) return null;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = CONTENT_TYPE[ext === "jpeg" ? "jpg" : ext];
  if (!type) return null;
  for (const dir of [LOCAL_UPLOAD_DIR, LEGACY_UPLOAD_DIR]) {
    try {
      return { body: await readFile(path.join(dir, name)), type };
    } catch {
      // Not in this directory — try the next one.
    }
  }
  return null;
}
