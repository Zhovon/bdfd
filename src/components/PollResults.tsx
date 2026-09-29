import type { PollResult } from "@/lib/content";
import { getDict } from "@/lib/i18n";

const fmt = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

/** Read-only results for a closed poll, highlighting the viewer's own pick. */
export default async function PollResults({ poll, myVote }: { poll: PollResult; myVote: number | null }) {
  const dict = await getDict();
  const t = dict.poll;
  return (
    <div className="rounded-lg border border-line p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-field">{poll.question}</p>
        <span className="log-label shrink-0 text-stone">{t.closedOn} · {fmt(poll.created_at, dict.intl)}</span>
      </div>
      <ul className="mt-4 grid gap-2.5">
        {poll.options.map((o) => {
          const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
          const mine = o.id === myVote;
          return (
            <li key={o.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className={mine ? "font-semibold text-field" : "text-field/80"}>
                  {o.label} {mine && "✓"}
                </span>
                <span className="tabular-nums text-stone">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand/70" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="log-label mt-3">
        {poll.totalVotes} {poll.totalVotes === 1 ? t.vote : t.votes}
      </p>
    </div>
  );
}
