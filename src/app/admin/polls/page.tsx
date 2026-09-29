import { listPolls } from "@/lib/content";
import { addPoll, closePollAction, reopenPollAction, deletePollAction } from "../actions";
import ConfirmButton from "@/components/ConfirmButton";
import { getDict } from "@/lib/i18n";

const fmt = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

export default async function AdminPolls() {
  const [polls, dict] = await Promise.all([listPolls(), getDict()]);
  const t = dict.adminUi;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
      {/* Create */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          {t.newPoll}
        </h2>
        <p className="mt-2 text-sm text-stone">{t.newPollIntro}</p>
        <form action={addPoll} className="mt-5 grid gap-4">
          <label>
            <span className="log-label text-field">{t.question}</span>
            <input
              name="question"
              required
              className="mt-2 w-full rounded-lg border border-line bg-husk px-3 py-2.5 text-field outline-none focus:border-brand"
            />
          </label>
          <label>
            <span className="log-label text-field">{t.options}</span>
            <textarea
              name="options"
              required
              rows={5}
              placeholder={"Bandarban\nSundarbans\nSylhet"}
              className="mt-2 w-full rounded-lg border border-line bg-husk px-3 py-2.5 text-field outline-none placeholder:text-stone/50 focus:border-brand"
            />
          </label>
          <button className="justify-self-start rounded-full bg-brand px-7 py-3 font-semibold text-husk transition-transform hover:-translate-y-0.5">
            {t.createPoll}
          </button>
        </form>
      </div>

      {/* All polls, current + archive */}
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          {t.pollsTitle} <span className="text-stone">({polls.length})</span>
        </h2>
        {polls.length === 0 ? (
          <p className="mt-4 text-stone">{t.noPolls}</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {polls.map((poll) => (
              <div key={poll.id} className="rounded-lg border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`log-label rounded-full px-2.5 py-1 ${
                          poll.active ? "bg-brand/10 text-brand" : "bg-stone/15 text-stone"
                        }`}
                      >
                        {poll.active ? t.open : t.closed}
                      </span>
                      <span className="log-label text-stone">{fmt(poll.created_at, dict.intl)}</span>
                    </div>
                    <p className="mt-2 font-semibold text-field">{poll.question}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {poll.active ? (
                      <form action={closePollAction}>
                        <input type="hidden" name="id" value={poll.id} />
                        <button className="log-label text-stone hover:text-field hover:underline">
                          {t.close}
                        </button>
                      </form>
                    ) : (
                      <form action={reopenPollAction}>
                        <input type="hidden" name="id" value={poll.id} />
                        <button className="log-label text-brand hover:underline">{t.reopen}</button>
                      </form>
                    )}
                    <form action={deletePollAction}>
                      <input type="hidden" name="id" value={poll.id} />
                      <ConfirmButton
                        message={t.confirmDeletePoll}
                        className="log-label text-stone hover:text-grain hover:underline"
                      >
                        {t.delete}
                      </ConfirmButton>
                    </form>
                  </div>
                </div>

                <ul className="mt-4 grid gap-2.5">
                  {poll.options.map((o) => {
                    const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
                    return (
                      <li key={o.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-field">{o.label}</span>
                          <span className="tabular-nums text-stone">
                            {o.votes} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="log-label mt-3">
                  {poll.totalVotes} {dict.poll.totalVotes}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
