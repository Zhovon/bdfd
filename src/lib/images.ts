import "server-only";
import sharp from "sharp";

/** Longest edge of the stored photo — sharp on a laptop, light on a phone. */
export const FULL_EDGE = 1600;
/** Longest edge of the thumbnail used in cards, grids and filmstrips. */
export const THUMB_EDGE = 480;
/** Square size for profile photos (and their small thumbnail). */
export const AVATAR_EDGE = 512;
export const AVATAR_THUMB_EDGE = 160;

/**
 * Refuse decoded images larger than this many pixels (~50 MP). A small file can
 * claim enormous dimensions ("decompression bomb"); this stops it before it can
 * exhaust server memory.
 */
const MAX_INPUT_PIXELS = 50_000_000;

export type ProcessedImage = { full: Buffer; thumb: Buffer };

/**
 * Normalise an uploaded photo: apply its EXIF rotation, shrink it to a sensible
 * size, strip all metadata (EXIF, GPS location, camera serials), and re-encode
 * as WebP — plus a small thumbnail. Animated GIFs stay animated.
 *
 * Throws if the bytes can't be decoded as an image.
 */
export async function processImage(
  input: Buffer,
  { avatar = false }: { avatar?: boolean } = {},
): Promise<ProcessedImage> {
  const animated = isGif(input);
  const source = () => sharp(input, { animated, limitInputPixels: MAX_INPUT_PIXELS }).rotate();

  // Avatars are cropped to a square; everything else keeps its shape.
  const fit = (edge: number) =>
    avatar
      ? { width: edge, height: edge, fit: "cover" as const }
      : { width: edge, height: edge, fit: "inside" as const, withoutEnlargement: true };

  const [full, thumb] = await Promise.all([
    source()
      .resize(fit(avatar ? AVATAR_EDGE : FULL_EDGE))
      .webp({ quality: 80, effort: 4 })
      .toBuffer(),
    source()
      .resize(fit(avatar ? AVATAR_THUMB_EDGE : THUMB_EDGE))
      .webp({ quality: 70, effort: 4 })
      .toBuffer(),
  ]);
  return { full, thumb };
}

const isGif = (buf: Buffer) => buf.subarray(0, 4).toString("latin1") === "GIF8";
