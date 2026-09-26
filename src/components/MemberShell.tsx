"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memberNav, org } from "@/lib/site";
import { logout } from "@/app/actions";

type Props = {
  user: { name: string; role: string; isAdmin: boolean };
  unread: number;
  children: React.ReactNode;
};

export default function MemberShell({ user, unread, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-husk/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/portal" className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] bg-field font-[family-name:var(--font-display)] text-sm font-bold text-grain"
              aria-hidden
            >
              {org.monogram}
            </span>
            <span className="hidden font-[family-name:var(--font-display)] font-bold text-field sm:block">
              Members&apos; area
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user.isAdmin && (
              <Link
                href="/admin"
                className="log-label rounded-full border border-field/25 px-3 py-1.5 text-field transition-colors hover:bg-field hover:text-husk"
              >
                Admin
              </Link>
            )}
            <Link
              href="/portal/notifications"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              className="relative grid h-9 w-9 place-items-center rounded-full text-field transition-colors hover:bg-husk-deep"
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-grain px-1 text-[0.6rem] font-bold text-husk">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <span className="hidden text-sm text-stone sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="log-label rounded-full border border-line px-3 py-1.5 text-stone transition-colors hover:text-field">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 md:flex-row">
        <nav className="flex gap-1 overflow-x-auto md:w-56 md:flex-col md:overflow-visible">
          {memberNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-field text-husk" : "text-field/80 hover:bg-husk-deep"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
