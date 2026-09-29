"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "./I18nProvider";

const noopSubscribe = () => () => {};

export type MediaItem = { kind: "image" | "video"; src: string };

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
 * Full-screen viewer for a set of photos/videos. Controlled: the parent owns
 * which item is showing (`index`, or null when closed). ← → and swipes move
 * through the set, Esc or a click on the backdrop closes it.
 */
export default function Lightbox({
  items,
  title,
  index,
  onIndex,
  onClose,
}: {
  items: MediaItem[];
  title: string;
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  // True only in the browser (portals need document.body); false during SSR.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const open = index !== null && items.length > 0;
  const current = index ?? 0;
  const touchX = useRef<number | null>(null);

  const next = useCallback(() => onIndex((current + 1) % items.length), [current, items.length, onIndex]);
  const prev = useCallback(
    () => onIndex((current - 1 + items.length) % items.length),
    [current, items.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, next, prev, onClose]);

  if (!mounted || !open) return null;

  const many = items.length > 1;
  const arrow =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-husk/30 text-husk transition-colors hover:bg-husk hover:text-field";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — ${current + 1} / ${items.length}`}
      className="fixed inset-0 z-[120] flex flex-col bg-field"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3 text-husk">
        <span className="min-w-0 truncate text-sm font-semibold text-husk/90">
          {title} · {current + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-husk/30 px-4 py-2 text-sm font-semibold text-husk transition-colors hover:bg-husk hover:text-field"
        >
          {t.notice.close}
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center gap-3 px-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null || !many) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
        }}
      >
        {many && (
          <button type="button" onClick={prev} aria-label={t.a11y.previous} className={`${arrow} hidden sm:grid`}>
            ‹
          </button>
        )}
        <MediaView item={items[current]} title={title} index={current} openLabel={t.notice.openVideo} />
        {many && (
          <button type="button" onClick={next} aria-label={t.a11y.next} className={`${arrow} hidden sm:grid`}>
            ›
          </button>
        )}
      </div>

      {/* Thumbnail strip — jump straight to any item in the set */}
      {many && (
        // w-max + mx-auto centres a short strip yet lets a long one scroll from
        // its first thumbnail (justify-center would clip the start on phones).
        <div className="overflow-x-auto px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto flex w-max gap-2">
            {items.map((item, i) => (
              <button
                key={`${item.src}-${i}`}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`${i + 1} / ${items.length}`}
                aria-current={i === current}
                className={`h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-opacity ${
                  i === current ? "border-husk opacity-100" : "border-transparent opacity-50 hover:opacity-90"
                }`}
              >
                {item.kind === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-husk/15 text-husk">▶</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function MediaView({
  item,
  title,
  index,
  openLabel,
}: {
  item: MediaItem;
  title: string;
  index: number;
  openLabel: string;
}) {
  if (item.kind === "image") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={item.src}
        alt={`${title} ${index + 1}`}
        className="max-h-[72vh] max-w-full rounded-lg object-contain"
      />
    );
  }
  const embed = toEmbed(item.src);
  if (embed) {
    return (
      <div className="aspect-video w-full max-w-4xl">
        <iframe
          src={embed}
          title={`${title} ${index + 1}`}
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
      {openLabel}
    </a>
  );
}
