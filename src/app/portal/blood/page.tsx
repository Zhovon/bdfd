import Link from "next/link";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listBloodDonors } from "@/lib/db";
import { getModule, BLOOD_GROUPS } from "@/lib/site";
import { getDict } from "@/lib/i18n";

const mod = getModule("blood")!;

export default async function BloodPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  await requireUser();
  const { group } = await searchParams;
  const active = group && BLOOD_GROUPS.includes(group) ? group : undefined;
  const [donors, dict] = await Promise.all([listBloodDonors(active), getDict()]);
  const t = dict.blood;

  return (
    <div>
      <ModuleHeader mod={mod}>
        <p className="mt-3 max-w-2xl text-sm text-stone">
          {t.intro}{" "}
          <Link href="/portal/profile" className="font-semibold text-brand hover:underline">
            {t.yourProfile}
          </Link>
          .
        </p>
      </ModuleHeader>

      {/* Group filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/portal/blood"
          className={`log-label rounded-full border px-4 py-2 transition-colors ${
            !active ? "border-field bg-field text-husk" : "border-line text-field hover:border-field/50"
          }`}
        >
          {t.all}
        </Link>
        {BLOOD_GROUPS.map((g) => (
          <Link
            key={g}
            href={`/portal/blood?group=${encodeURIComponent(g)}`}
            className={`log-label rounded-full border px-4 py-2 transition-colors ${
              active === g ? "border-grain bg-grain text-husk" : "border-line text-field hover:border-grain/50"
            }`}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Donor list */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-husk-deep">
              {[t.name, t.group, t.mobile, t.posting].map((h) => (
                <th key={h} className="log-label px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {donors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-stone">
                  {active ? t.noDonorsFor : t.noDonors}
                </td>
              </tr>
            ) : (
              donors.map((d) => (
                <tr key={d.id} className="border-b border-line/60 hover:bg-husk-deep/50">
                  <td className="px-4 py-3 font-semibold text-field">{d.full_name}</td>
                  <td className="px-4 py-3">
                    <span className="log-label rounded-full bg-grain/10 px-2.5 py-1 text-grain">
                      {d.blood_group}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-field/90">{d.mobile}</td>
                  <td className="px-4 py-3 text-stone">{d.posting}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
