import { castVoteAction } from "@/app/portal/actions";
import type { PollResult } from "@/lib/content";
import { getDict } from "@/lib/i18n";

export default async function PollCard({ poll, myVote }: { poll: PollResult; myVote: number | null }) {
  const voted = myVote != null;
  const t = await getDict();

  return (
    <div className="rounded-lg border border-line bg-husk-deep p-6">
      <p className="log-label text-brand">{t.poll.label}</p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {poll.question}
      </h3>

      {voted ? (
        <ul className="mt-5 grid gap-3">
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
                <div className="h-2.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
          <p className="log-label mt-1">
            {poll.totalVotes} {poll.totalVotes === 1 ? t.poll.vote : t.poll.votes}
          </p>
        </ul>
      ) : (
        <form action={castVoteAction} className="mt-5 grid gap-2">
          <input type="hidden" name="pollId" value={poll.id} />
          {poll.options.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-husk px-4 py-3 transition-colors hover:border-brand"
            >
              <input type="radio" name="optionId" value={o.id} required className="accent-[var(--brand)]" />
              <span className="text-field">{o.label}</span>
            </label>
          ))}
          <button className="mt-2 justify-self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-husk transition-transform hover:-translate-y-0.5">
            {t.polls.vote}
          </button>
        </form>
      )}
    </div>
  );
}
