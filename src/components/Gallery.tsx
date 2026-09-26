"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Notice photo gallery. One image renders as a banner; several render as a
 * cover + thumbnail row. Any image opens a full-screen lightbox with keyboard
 * navigation (← → to move, Esc to close).
 */
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const show = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, next, prev]);

  if (images.length === 0) return null;

  const single = images.length === 1;

  return (
    <div className="mt-4">
      {single ? (
        <button
          type="button"
          onClick={() => show(0)}
          className="block w-full overflow-hidden rounded-lg border border-line"
          aria-label="View photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="" className="aspect-[16/9] w-full object-cover transition-transform hover:scale-[1.02]" />
        </button>
      ) : (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => show(0)}
            className="block overflow-hidden rounded-lg border border-line"
            aria-label="View photo 1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0]} alt="" className="aspect-[16/9] w-full object-cover transition-transform hover:scale-[1.02]" />
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.slice(1).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => show(i + 1)}
                className="relative shrink-0 overflow-hidden rounded-md border border-line"
                aria-label={`View photo ${i + 2}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-16 w-20 object-cover transition-transform hover:scale-105" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} — photo ${index + 1} of ${images.length}`}
            className="fixed inset-0 z-[120] flex flex-col bg-field/95 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div className="flex items-center justify-between px-5 py-3 text-husk">
              <span className="log-label text-husk/70">
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="log-label rounded-full border border-husk/30 px-4 py-2 text-husk transition-colors hover:bg-husk hover:text-field"
              >
                Close ✕
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center gap-3 px-4 pb-6" onClick={(e) => e.stopPropagation()}>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous photo"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-husk/30 text-husk transition-colors hover:bg-husk hover:text-field"
                >
                  ‹
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[index]}
                alt={`${title} photo ${index + 1}`}
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next photo"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-husk/30 text-husk transition-colors hover:bg-husk hover:text-field"
                >
                  ›
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
