"use client";

import { useState } from "react";

type Props = Omit<React.ComponentPropsWithoutRef<"input">, "type" | "className">;

/**
 * A password field with a show/hide toggle, styled to match the auth forms'
 * underline inputs. Accepts the usual input props (name, required, etc.).
 */
export default function PasswordInput(props: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-2 flex items-center border-b-2 border-line transition-colors focus-within:border-brand">
      <input
        {...props}
        type={show ? "text" : "password"}
        className="w-full bg-transparent pb-2 text-lg text-field outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="shrink-0 pb-2 pl-3 text-stone transition-colors hover:text-field"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
            <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a13.3 13.3 0 0 1-2.2 3M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 3.4-.5" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
