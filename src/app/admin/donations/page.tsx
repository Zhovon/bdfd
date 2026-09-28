import { listDonations, donationTotals, type Donation } from "@/lib/payments";
import { verifyDonation, rejectDonation } from "../actions";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
const taka = (n: number | string) => `৳ ${Number(n).toLocaleString("en-BD")}`;

const badge: Record<Donation["status"], string> = {
  reported: "bg-grain/10 text-grain",
  verified: "bg-brand/10 text-brand",
  rejected: "bg-stone/15 text-stone",
};

export default async function AdminDonations() {
  const [donations, totals] = await Promise.all([listDonations(), donationTotals()]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          Payments
        </h2>
        <span className="log-label">Verified {taka(totals.verified)} · Awaiting {taka(totals.reported)}</span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Donor", "For", "Amount", "Method", "Reference", "Date", "Status", "Actions"].map((h) => (
                <th key={h} className="log-label whitespace-nowrap py-3 pr-4 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-stone">
                  No payments reported yet.
                </td>
              </tr>
            ) : (
              donations.map((d) => (
                <tr key={d.id} className="border-b border-line/60 align-top hover:bg-husk-deep/50">
                  <td className="py-3 pr-4 font-semibold text-field">
                    {d.donor_name}
                    {d.note && <span className="block font-normal text-stone">{d.note}</span>}
                  </td>
                  <td className="py-3 pr-4 text-field/90">
                    <span
                      className={`log-label rounded-full px-2 py-0.5 ${
                        d.kind === "participation" ? "bg-brand/10 text-brand" : "bg-grain/10 text-grain"
                      }`}
                    >
                      {d.kind === "participation" ? "Tour" : "Welfare"}
                    </span>
                    {d.post_title && <span className="mt-1 block text-stone">{d.post_title}</span>}
                  </td>
                  <td className="py-3 pr-4 tabular-nums font-semibold text-field">{taka(d.amount)}</td>
                  <td className="py-3 pr-4 text-field/90">{d.method}</td>
                  <td className="py-3 pr-4 font-[family-name:var(--font-mono)] text-field/90">
                    {d.transaction_ref}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-stone">{fmt(d.created_at)}</td>
                  <td className="py-3 pr-4">
                    <span className={`log-label rounded-full px-2.5 py-1 ${badge[d.status]}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {d.status === "reported" && (
                      <div className="flex items-center gap-3">
                        <form action={verifyDonation}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="log-label text-brand hover:underline">Verify</button>
                        </form>
                        <form action={rejectDonation}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="log-label text-stone hover:text-grain hover:underline">
                            Reject
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
