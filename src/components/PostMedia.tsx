"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Item = { kind: "image" | "video"; src: string };

/** Convert a YouTube/Vimeo/Facebook link to an embeddable URL, or null. */
function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (host.endsWith("facebook.com") || host === "fb.watch") {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
    return null;
  } catch {
    return null;
  }
}

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
  const items: Item[] = [
    ...images.map((src) => ({ kind: "image" as const, src })),
    ...videos.map((src) => ({ kind: "video" as const, src })),
  ];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const show = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);
  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);

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

  if (items.length === 0) return null;

  const mainImage = images[0] ?? null;
  const galleryLabel = [
    images.length ? `${images.length} photo${images.length > 1 ? "s" : ""}` : null,
    videos.length ? `${videos.length} video${videos.length > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-xl border border-line">
        {mainImage ? (
          <button type="button" onClick={() => show(0)} className="block w-full" aria-label="View photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              alt=""
              className="aspect-[16/9] w-full object-cover transition-transform hover:scale-[1.02]"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => show(0)}
            className="flex aspect-[16/9] w-full items-center justify-center bg-field text-husk"
            aria-label="Play video"
          >
            <PlayIcon />
          </button>
        )}

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => show(0)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-field/85 px-4 py-2 text-sm font-semibold text-husk backdrop-blur-sm transition-colors hover:bg-field"
          >
            <GridIcon />
            View gallery <span className="font-normal text-husk/70">· {galleryLabel}</span>
          </button>
        )}
      </div>

      {/* Lightbox */}
      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} — ${index + 1} of ${items.length}`}
            className="fixed inset-0 z-[120] flex flex-col bg-field/95 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div className="flex items-center justify-between px-5 py-3 text-husk">
              <span className="log-label text-husk/70">
                {index + 1} / {items.length}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="log-label rounded-full border border-husk/30 px-4 py-2 text-husk transition-colors hover:bg-husk hover:text-field"
              >
                Close ✕
              </button>
            </div>

            <div
              className="flex flex-1 items-center justify-center gap-3 px-4 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-husk/30 text-husk transition-colors hover:bg-husk hover:text-field"
                >
                  ‹
                </button>
              )}
              <MediaView item={items[index]} title={title} index={index} />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next"
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

function MediaView({ item, title, index }: { item: Item; title: string; index: number }) {
  if (item.kind === "image") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={item.src}
        alt={`${title} photo ${index + 1}`}
        className="max-h-[80vh] max-w-full rounded-lg object-contain"
      />
    );
  }
  const embed = toEmbed(item.src);
  if (embed) {
    return (
      <div className="aspect-video w-full max-w-4xl">
        <iframe
          src={embed}
          title={`${title} video ${index + 1}`}
          className="h-full w-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <a
      href={item.src}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-husk px-6 py-3 font-semibold text-field"
    >
      Open video ↗
    </a>
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
function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
