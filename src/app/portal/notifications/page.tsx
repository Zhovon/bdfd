import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listNotifications, type Notification } from "@/lib/notifications";
import MarkNotificationsRead from "@/components/MarkNotificationsRead";

const rel = (d: Date) => {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(d));
};

const dot: Record<Notification["type"], string> = {
  notice: "bg-brand",
  donation: "bg-grain",
  account: "bg-field",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="max-w-2xl">
      <MarkNotificationsRead hasUnread={hasUnread} />
      <p className="log-label text-brand">Updates</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        Notifications
      </h1>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-line p-10 text-center text-stone">
          Nothing yet. New notices and updates about your account will appear here.
        </p>
      ) : (
        <ul className="mt-8 grid gap-2">
          {items.map((n) => {
            const inner = (
              <div
                className={`flex gap-3 rounded-lg border p-4 transition-colors ${
                  n.read ? "border-line bg-husk" : "border-brand/30 bg-brand/[0.04]"
                }`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-line" : dot[n.type]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`font-semibold ${n.read ? "text-field/80" : "text-field"}`}>{n.title}</p>
                    <span className="log-label shrink-0 text-stone">{rel(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-stone">{n.body}</p>}
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
