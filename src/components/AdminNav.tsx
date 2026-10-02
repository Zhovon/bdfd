"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";

// adminOnly tabs are hidden from moderators.
const tabs = [
  { href: "/admin", label: "membership", adminOnly: true },
  { href: "/admin/content", label: "content", adminOnly: false },
  { href: "/admin/polls", label: "polls", adminOnly: false },
  { href: "/admin/donations", label: "payments", adminOnly: false },
  { href: "/admin/payments", label: "accounts", adminOnly: true },
  { href: "/admin/tickers", label: "tickers", adminOnly: true },
] as const;

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const labels = useI18n().t.adminUi.tabs;
  const visible = tabs.filter((t) => !t.adminOnly || role === "admin");
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {visible.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active
                ? "border-brand text-field"
                : "border-transparent text-stone hover:text-field"
            }`}
          >
            {labels[t.label]}
          </Link>
        );
      })}
    </nav>
  );
}
