"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

/**
 * Cloudflare Turnstile widget. Renders explicitly so we can reset it after a
 * failed submit (tokens are single-use). The solved token is submitted as the
 * form field `cf-turnstile-response`.
 */
export default function Turnstile({ siteKey, resetKey }: { siteKey: string; resetKey?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const render = () => {
    if (!window.turnstile || !ref.current || widgetId.current !== null) return;
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      theme: "light",
    });
  };

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the widget whenever the parent bumps resetKey (e.g. after an error).
  useEffect(() => {
    if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={render}
      />
      <div ref={ref} />
    </>
  );
}
