import { describe, expect, it } from "vitest";
import { photoSrcSet, thumbUrl } from "@/lib/media";

describe("thumbUrl", () => {
  it("maps a stored full photo to its thumbnail", () => {
    expect(thumbUrl("/uploads/post-1-cover-0-abc.f.webp")).toBe("/uploads/post-1-cover-0-abc.t.webp");
    expect(thumbUrl("https://cdn.example/uploads/x.f.webp")).toBe("https://cdn.example/uploads/x.t.webp");
  });

  it("leaves older uploads and external links unchanged", () => {
    expect(thumbUrl("/uploads/old-photo.png")).toBe("/uploads/old-photo.png");
    expect(thumbUrl("/uploads/old-photo.webp")).toBe("/uploads/old-photo.webp");
    expect(thumbUrl("https://picsum.photos/seed/x/800/600")).toBe("https://picsum.photos/seed/x/800/600");
  });

  it("passes null through", () => {
    expect(thumbUrl(null)).toBeNull();
  });
});

describe("photoSrcSet", () => {
  it("offers thumbnail and full sizes for new uploads", () => {
    expect(photoSrcSet("/uploads/a.f.webp")).toBe("/uploads/a.t.webp 480w, /uploads/a.f.webp 1600w");
  });

  it("is undefined when there is no thumbnail", () => {
    expect(photoSrcSet("/uploads/a.png")).toBeUndefined();
    expect(photoSrcSet(null)).toBeUndefined();
  });
});
