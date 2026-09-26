import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

/**
 * Save an uploaded image to /public/uploads and return its public URL.
 * Returns null when no file was provided; throws on an oversized/invalid file.
 * For a prototype this writes to local disk — swap for object storage in production.
 */
export async function saveUpload(
  file: FormDataEntryValue | null,
  basename: string,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("Image must be under 4 MB.");

  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED.has(ext)) throw new Error("Use a JPG, PNG, WebP, GIF or AVIF image.");

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${basename}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
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
