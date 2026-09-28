import { listPaymentMethods } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { savePaymentMethod } from "../actions";

export default async function AdminPayments() {
  await requireAdmin(); // admin-only; moderators redirected to /admin/content
  const methods = await listPaymentMethods(false);
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
        Receiving accounts
      </h2>
      <p className="mt-2 max-w-2xl text-stone">
        The mobile-banking and bank accounts shown to members on every payment page. Update the
        account numbers and instructions here.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {methods.map((m) => (
          <form
            key={m.id}
            action={savePaymentMethod}
            className="grid gap-3 rounded-lg border border-line p-5"
          >
            <input type="hidden" name="id" value={m.id} />
            <div className="flex items-center justify-between">
              <span className="log-label text-brand">{m.kind}</span>
              <label className="flex items-center gap-2 text-sm text-stone">
                <input type="checkbox" name="active" defaultChecked={m.active} className="h-4 w-4 accent-[var(--brand)]" />
                Active
              </label>
            </div>
            <label>
              <span className="log-label text-field">Label</span>
              <input
                name="label"
                defaultValue={m.label}
                className="mt-1 w-full rounded border border-line bg-husk px-3 py-2 text-field outline-none focus:border-brand"
              />
            </label>
            <label>
              <span className="log-label text-field">Account name</span>
              <input
                name="account_name"
                defaultValue={m.account_name}
                className="mt-1 w-full rounded border border-line bg-husk px-3 py-2 text-field outline-none focus:border-brand"
              />
            </label>
            <label>
              <span className="log-label text-field">Account / number</span>
              <input
                name="account_number"
                defaultValue={m.account_number}
                className="mt-1 w-full rounded border border-line bg-husk px-3 py-2 font-[family-name:var(--font-mono)] text-field outline-none focus:border-brand"
              />
            </label>
            <label>
              <span className="log-label text-field">Instructions</span>
              <textarea
                name="instructions"
                defaultValue={m.instructions ?? ""}
                rows={2}
                className="mt-1 w-full rounded border border-line bg-husk px-3 py-2 text-field outline-none focus:border-brand"
              />
            </label>
            <button className="justify-self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-husk transition-transform hover:-translate-y-0.5">
              Save
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
