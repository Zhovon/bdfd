import type { Metadata } from "next";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { requireStaff } from "@/lib/session";
import { logout } from "@/app/actions";
import { org } from "@/lib/site";

export const metadata: Metadata = {
  title: `Admin — ${org.name}`,
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="log-label text-brand">Admin panel · {staff.role}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
            {org.short}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal"
            className="log-label rounded-full border border-field/25 px-4 py-2 text-field transition-colors hover:bg-field hover:text-husk"
          >
            Members&apos; view
          </Link>
          <form action={logout}>
            <button className="log-label rounded-full border border-line px-4 py-2 text-stone transition-colors hover:text-field">
              Log out
            </button>
          </form>
        </div>
      </header>
      <div className="mt-6">
        <AdminNav role={staff.role} />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
