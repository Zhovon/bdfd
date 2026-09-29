import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { latestPosts, countPosts } from "@/lib/content";
import { listBloodDonors } from "@/lib/db";
import { categoryMeta } from "@/lib/site";
import { getDict, type Dict } from "@/lib/i18n";
import PostBoard from "@/components/PostBoard";

const rel = (d: Date, t: Dict) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return t.dashboard.today;
  if (days === 1) return t.dashboard.yesterday;
  if (days < 7) return `${days} ${t.dashboard.daysAgo}`;
  return new Intl.DateTimeFormat(t.intl, { day: "2-digit", month: "short" }).format(new Date(d));
};

export default async function PortalDashboard() {
  // A small preview only — never the whole table. First 4 become cards, the
  // rest a compact "older" strip; full history lives on the category boards.
  const [user, t, recent, totalPosts, tourCount, donors] = await Promise.all([
    getSessionUser(),
    getDict(),
    latestPosts(12),
    countPosts(),
    countPosts("travel"),
    listBloodDonors(),
  ]);
  const firstName = user?.full_name.split(" ")[0] ?? t.dashboard.officer;
  const initials = (user?.full_name ?? "O")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const latest = recent.slice(0, 4); // newest four as cards
  const older = recent.slice(4); // the next few as a compact list

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
            {t.dashboard.memberDashboard} · {user ? t.adminUi.roles[user.role] : ""}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
            {t.dashboard.welcome}, {firstName}
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label={t.dashboard.tours} value={String(tourCount)} sub={t.dashboard.toursSub} href="/portal/travel" icon={<PinIcon />} accent="#006A4E" />
        <Stat label={t.dashboard.bloodDonors} value={String(donors.length)} sub={t.dashboard.bloodDonorsSub} href="/portal/blood" icon={<DropIcon />} accent="#D21034" />
        <Stat label={t.dashboard.notices} value={String(totalPosts)} sub={t.dashboard.noticesSub} href="/portal/association" icon={<DocIcon />} accent="#0A3B2C" />
      </div>

      {/* Latest posts — newest four as cards */}
      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-field">
          {t.dashboard.latest}
        </h2>
        {totalPosts > 0 && <span className="log-label text-stone">{totalPosts} {t.common.total}</span>}
      </div>
      <div className="mt-4">
        <PostBoard posts={latest} showCategory empty={t.dashboard.noPosts} />
      </div>

      {/* Older notices — the rest, compact, newest first */}
      {older.length > 0 && (
        <>
          <h2 className="mt-12 font-[family-name:var(--font-display)] text-xl font-bold text-field">
            {t.dashboard.older}
          </h2>
          <ul className="mt-4 overflow-hidden rounded-xl border border-line">
            {older.map((p) => {
              const meta = categoryMeta(p.category);
              const label = t.boards[p.category as keyof typeof t.boards]?.label ?? p.category;
              return (
                <li key={p.id} className="border-b border-line last:border-0">
                  <Link
                    href={`/portal/notice/${p.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-husk-deep"
                  >
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.accent }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-field">{p.title}</span>
                      <span className="log-label" style={{ color: meta.accent }}>
                        {label}
                      </span>
                    </span>
                    <span className="log-label shrink-0 text-stone">{rel(p.created_at, t)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
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

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" fill="currentColor" opacity="0.9" />
      <circle cx="12" cy="10" r="2.4" fill="var(--husk-deep)" />
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
