"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";
import Lightbox, { type MediaItem } from "./Lightbox";
import { GridIcon } from "./PostMedia";

/** Thumbnails shown under the lead photo; the rest are reached via "+N". */
const THUMBS = 4;

/**
 * One section's own photo gallery: the lead photo large, a row of thumbnails
 * under it, and a full-screen viewer that pages through only this section's
 * photos — separate from the cover gallery and from every other section.
 */
export default function SectionGallery({ images, title }: { images: string[]; title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;

  const items: MediaItem[] = images.map((src) => ({ kind: "image", src }));
  const thumbs = images.slice(1, 1 + THUMBS);
  const hidden = images.length - 1 - thumbs.length;
  const countLabel = `${images.length} ${images.length > 1 ? t.notice.photos : t.notice.photo}`;

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-xl border border-line">
        <button type="button" onClick={() => setOpen(0)} className="block w-full" aria-label={t.a11y.viewPhoto}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt=""
            loading="lazy"
            className="aspect-[16/9] w-full object-cover transition-transform hover:scale-[1.02]"
          />
        </button>
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(0)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-field/85 px-4 py-2 text-sm font-semibold text-husk backdrop-blur-sm transition-colors hover:bg-field"
          >
            <GridIcon />
            {t.notice.viewGallery} <span className="font-normal text-husk/70">· {countLabel}</span>
          </button>
        )}
      </div>

      {thumbs.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {thumbs.map((src, i) => {
            const at = i + 1; // position in the full set
            const more = hidden > 0 && i === thumbs.length - 1;
            return (
              <button
                key={`${src}-${at}`}
                type="button"
                onClick={() => setOpen(at)}
                aria-label={more ? `+${hidden} · ${t.notice.viewGallery}` : `${at + 1} / ${images.length}`}
                className="relative block overflow-hidden rounded-lg border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform hover:scale-[1.04]"
                />
                {more && (
                  <span className="absolute inset-0 grid place-items-center bg-field/60 font-[family-name:var(--font-display)] text-xl font-bold text-husk">
                    +{hidden}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Lightbox items={items} title={title} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}
