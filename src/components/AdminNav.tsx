"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// adminOnly tabs are hidden from moderators.
const tabs = [
  { href: "/admin", label: "Membership", adminOnly: true },
  { href: "/admin/content", label: "Content", adminOnly: false },
  { href: "/admin/polls", label: "Polls", adminOnly: false },
  { href: "/admin/donations", label: "Payments", adminOnly: false },
  { href: "/admin/payments", label: "Accounts", adminOnly: true },
];

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
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
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
