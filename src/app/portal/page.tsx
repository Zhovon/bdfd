import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { listAllPosts } from "@/lib/content";
import { donationTotals } from "@/lib/payments";
import { listBloodDonors } from "@/lib/db";
import PostBoard from "@/components/PostBoard";

const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

export default async function PortalDashboard() {
  const [user, posts, totals, donors] = await Promise.all([
    getSessionUser(),
    listAllPosts(),
    donationTotals("donation"), // welfare fund = donations only, not tour fees
    listBloodDonors(),
  ]);
  const firstName = user?.full_name.split(" ")[0] ?? "Officer";
  const initials = (user?.full_name ?? "O")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      {/* Greeting */}
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-field text-lg font-bold text-husk">
          {user?.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div>
          <p className="log-label text-brand">
            Members&apos; dashboard · <span className="capitalize">{user?.role}</span>
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
            Welcome, {firstName}
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Welfare fund" value={taka(totals.verified)} sub="verified" href="/portal/welfare" icon={<HeartIcon />} accent="#D21034" />
        <Stat label="Blood donors" value={String(donors.length)} sub="on call" href="/portal/blood" icon={<DropIcon />} accent="#006A4E" />
        <Stat label="Notices" value={String(posts.length)} sub="posted" href="/portal/association" icon={<DocIcon />} accent="#0A3B2C" />
      </div>

      {/* Latest posts */}
      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-field">
          Latest posts
        </h2>
        {posts.length > 0 && <span className="log-label text-stone">{posts.length} total</span>}
      </div>
      <div className="mt-4">
        <PostBoard posts={posts.slice(0, 4)} showCategory empty="No posts yet." />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line bg-husk-deep p-5 transition-all hover:border-field/40 hover:shadow-[0_6px_24px_-14px_rgba(10,59,44,0.4)]"
    >
      <div className="flex items-center justify-between">
        <p className="log-label">{label}</p>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-field tabular-nums">
        {value}
      </p>
      <p className="log-label mt-0.5 text-stone">{sub}</p>
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 20s-7-4.35-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
function DropIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
