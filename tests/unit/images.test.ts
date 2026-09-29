import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { AVATAR_EDGE, FULL_EDGE, THUMB_EDGE, processImage } from "@/lib/images";

/** A solid-colour JPEG of the given size, optionally carrying EXIF data. */
function jpeg(width: number, height: number, exif?: { orientation?: number; gps?: boolean }) {
  let img = sharp({ create: { width, height, channels: 3, background: "#2856a0" } }).jpeg();
  if (exif) {
    img = img.withMetadata({
      orientation: exif.orientation,
      exif: exif.gps ? { IFD3: { GPSLatitudeRef: "N", GPSLatitude: "23/1 48/1 0/1" } } : undefined,
    });
  }
  return img.toBuffer();
}

describe("processImage", () => {
  it("caps a large photo and makes a thumbnail, both WebP", async () => {
    const { full, thumb } = await processImage(await jpeg(4032, 3024));
    const f = await sharp(full).metadata();
    const t = await sharp(thumb).metadata();
    expect(f.format).toBe("webp");
    expect([f.width, f.height]).toEqual([FULL_EDGE, 1200]);
    expect([t.width, t.height]).toEqual([THUMB_EDGE, 360]);
  });

  it("never enlarges a small photo", async () => {
    const { full } = await processImage(await jpeg(300, 200));
    const m = await sharp(full).metadata();
    expect([m.width, m.height]).toEqual([300, 200]);
  });

  it("turns a sideways phone photo upright and strips EXIF, including GPS", async () => {
    const { full } = await processImage(await jpeg(1200, 600, { orientation: 6, gps: true }));
    const m = await sharp(full).metadata();
    expect([m.width, m.height]).toEqual([600, 1200]);
    expect(m.exif).toBeUndefined();
    expect(m.orientation).toBeUndefined();
  });

  it("crops avatars to a square", async () => {
    const { full } = await processImage(await jpeg(1200, 600), { avatar: true });
    const m = await sharp(full).metadata();
    expect([m.width, m.height]).toEqual([AVATAR_EDGE, AVATAR_EDGE]);
  });

  it("rejects bytes that aren't a decodable image", async () => {
    const corrupt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not really a jpeg")]);
    await expect(processImage(corrupt)).rejects.toThrow();
  });
});
