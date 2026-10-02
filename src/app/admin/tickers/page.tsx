import { requireAdmin } from "@/lib/session";
import { getDict } from "@/lib/i18n";
import { pool, ensureSchema } from "@/lib/db";
import { createTicker, toggleTicker, removeTicker } from "@/app/admin/actions";
import { type Ticker } from "@/lib/content";

export default async function TickersAdminPage() {
  await requireAdmin();
  const t = (await getDict()).adminUi;
  
  await ensureSchema();
  const { rows } = await pool.query<Ticker>(
    `SELECT id, message, active, created_at FROM tickers ORDER BY created_at DESC`
  );

  return (
    <div className="max-w-2xl">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field mb-6">
        {t.tabs.tickers}
      </h2>
      
      <form action={createTicker} className="mb-10 bg-surface border border-line rounded-xl p-5 shadow-sm">
        <label className="block mb-3">
          <span className="log-label text-field block mb-2">New Ticker Message</span>
          <input
            name="message"
            required
            placeholder="e.g., Oct 25 – Registration deadline!"
            className="w-full rounded-lg border border-line bg-husk px-3 py-2 text-field outline-none focus:border-brand"
          />
        </label>
        <button type="submit" className="log-label rounded-lg bg-brand px-5 py-2 text-husk transition-colors hover:bg-brand-hover">
          Add Ticker
        </button>
      </form>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-stone">No tickers found.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 bg-surface border border-line rounded-xl p-4 shadow-sm">
              <div className="flex-1">
                <p className={`text-field font-medium ${!row.active && "opacity-50 line-through"}`}>{row.message}</p>
                <p className="text-stone text-sm mt-1">{new Date(row.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <form action={async () => {
                  "use server";
                  await toggleTicker(row.id, !row.active);
                }}>
                  <button className="log-label rounded-lg border border-line px-3 py-1.5 text-stone hover:text-field hover:bg-husk transition-colors">
                    {row.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  await removeTicker(row.id);
                }}>
                  <button className="log-label rounded-lg border border-red-500/30 text-red-500 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-colors">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
