/**
 * Browser-side photo shrinking, run before upload so a member on mobile data
 * sends a few hundred KB instead of a multi-megabyte camera original. The server
 * re-encodes everything anyway (lib/images.ts), so this is purely a bandwidth
 * optimisation: any failure falls back to the original file.
 */

/** Longest edge sent to the server — the size it stores (images.ts FULL_EDGE). */
const MAX_EDGE = 1600;
/** Below this size a photo is sent as-is — not worth the decode/encode. */
const SMALL_ENOUGH = 700 * 1024;
const QUALITY = 0.85;

let webpSupported: boolean | null = null;
function canEncodeWebp(): boolean {
  if (webpSupported === null) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupported;
}

/** Shrink one photo; returns the original when shrinking isn't possible or helpful. */
export async function shrinkImage(file: File): Promise<File> {
  // GIFs may be animated (a canvas keeps only the first frame); leave them alone.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= SMALL_ENOUGH) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // WebP keeps transparency; JPEG doesn't, so give it a white background.
    const type = canEncodeWebp() ? "image/webp" : "image/jpeg";
    if (type === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg");
    return new File([blob], name, { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Shrink every file in a list, preserving order. */
export function shrinkImages(files: FileList | File[]): Promise<File[]> {
  return Promise.all(Array.from(files).map(shrinkImage));
}
