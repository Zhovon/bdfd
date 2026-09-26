"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { org, modules } from "@/lib/site";

type Props = { authed?: boolean; isAdmin?: boolean };

export default function SiteHeader({ authed = false, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Logged-in visitors get links into the members' area; anonymous ones to login.
  const moduleHref = (slug: string) => (authed ? `/portal/${slug}` : "/login");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-husk/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label={`${org.name} home`}>
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] bg-field font-[family-name:var(--font-display)] text-sm font-bold text-grain"
            aria-hidden
          >
            {org.monogram}
          </span>
          <span className="block max-w-[16rem] font-[family-name:var(--font-display)] text-base font-bold leading-tight text-field sm:text-lg">
            {org.name}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {authed ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="log-label hidden rounded-full px-3 py-2 text-field transition-colors hover:text-brand sm:inline-block"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/portal"
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-husk transition-transform hover:-translate-y-0.5"
              >
                Members&apos; area
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="log-label rounded-full px-3 py-2 text-field transition-colors hover:text-brand"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-husk transition-transform hover:-translate-y-0.5 sm:inline-block"
              >
                Register
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex items-center gap-2.5 rounded-full border border-field/25 px-4 py-2 text-field transition-colors hover:border-field/60 hover:bg-field hover:text-husk"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <WheatIcon />
            <span className="log-label text-field group-hover:text-husk">Menu</span>
          </button>
        </div>
      </div>

      {/* Pop menu — full-screen waypoint overlay */}
      {mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="contour absolute inset-0 bg-field" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-husk/15 px-5 py-3">
            <span className="log-label text-grain">{org.short} · menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="log-label rounded-full border border-husk/30 px-4 py-2 text-husk transition-colors hover:bg-husk hover:text-field"
            >
              Close ✕
            </button>
          </div>

          <nav className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-1 px-5">
            <p className="log-label mb-2 text-husk/40">Inside the members&apos; area</p>
            {modules.map((m) => (
              <Link
                key={m.slug}
                href={moduleHref(m.slug)}
                onClick={() => setOpen(false)}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-husk/10 py-4 transition-colors hover:bg-husk/5"
              >
                <span className="log-label w-12 text-grain">{m.code}</span>
                <span className="min-w-0">
                  <span className="block font-[family-name:var(--font-display)] text-2xl font-bold text-husk transition-transform duration-300 group-hover:translate-x-2 sm:text-3xl">
                    {m.title}
                  </span>
                  <span className="mt-1 hidden text-sm text-husk/55 sm:block">{m.blurb}</span>
                </span>
                <span className="log-label text-husk/40 group-hover:text-grain">
                  {authed ? "open →" : "members"}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-center gap-3 px-5 py-6">
            {authed ? (
              <Link
                href="/portal"
                onClick={() => setOpen(false)}
                className="rounded-full bg-brand px-6 py-3 font-semibold text-husk"
              >
                Go to members&apos; area
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-brand px-6 py-3 font-semibold text-husk"
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-husk/30 px-6 py-3 font-semibold text-husk transition-colors hover:bg-husk hover:text-field"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
          </div>,
          document.body,
        )}
    </header>
  );
}

function WheatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-brand">
      <path d="M8 15V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M8 6c-1.6-.4-2.6-1.4-3-3 1.6.4 2.6 1.4 3 3ZM8 6c1.6-.4 2.6-1.4 3-3-1.6.4-2.6 1.4-3 3ZM8 10c-1.6-.4-2.6-1.4-3-3 1.6.4 2.6 1.4 3 3ZM8 10c1.6-.4 2.6-1.4 3-3-1.6.4-2.6 1.4-3 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
