"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";
import Lightbox, { type MediaItem } from "./Lightbox";
import { photoSrcSet } from "@/lib/media";

/**
 * A post's media: one main image inline plus a "View gallery" button that opens
 * every photo and video in a full-screen lightbox (← → to move, Esc to close).
 */
export default function PostMedia({
  images,
  videos,
  title,
}: {
  images: string[];
  videos: string[];
  title: string;
}) {
  const { t } = useI18n();
  const items: MediaItem[] = [
    ...images.map((src) => ({ kind: "image" as const, src })),
    ...videos.map((src) => ({ kind: "video" as const, src })),
  ];
  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) return null;

  const mainImage = images[0] ?? null;
  const galleryLabel = [
    images.length ? `${images.length} ${images.length > 1 ? t.notice.photos : t.notice.photo}` : null,
    videos.length ? `${videos.length} ${videos.length > 1 ? t.notice.videos : t.notice.video}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-xl border border-line">
        {mainImage ? (
          <button type="button" onClick={() => setOpen(0)} className="block w-full" aria-label={t.a11y.viewPhoto}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              srcSet={photoSrcSet(mainImage)}
              sizes="(min-width: 768px) 768px, 100vw"
              alt=""
              className="aspect-[16/9] w-full object-cover transition-transform hover:scale-[1.02]"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(0)}
            className="flex aspect-[16/9] w-full items-center justify-center bg-field text-husk"
            aria-label={t.a11y.playVideo}
          >
            <PlayIcon />
          </button>
        )}

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(0)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-field/85 px-4 py-2 text-sm font-semibold text-husk backdrop-blur-sm transition-colors hover:bg-field"
          >
            <GridIcon />
            {t.notice.viewGallery} <span className="font-normal text-husk/70">· {galleryLabel}</span>
          </button>
        )}
      </div>

      <Lightbox items={items} title={title} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M10 8.5l6 3.5-6 3.5V8.5Z" fill="currentColor" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
