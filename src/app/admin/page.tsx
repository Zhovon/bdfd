import Link from "next/link";
import { listUsers, searchUsers, statusCounts, USERS_PER_PAGE, type User, type UserStatus } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { approveUser, rejectUser, blockUser, unblockUser, setRole, removeUser } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";
import ListFilters from "@/components/ListFilters";
import Pagination from "@/components/Pagination";
import { getDict } from "@/lib/i18n";

const badge: Record<User["status"], string> = {
  pending: "bg-grain/10 text-grain",
  approved: "bg-brand/10 text-brand",
  rejected: "bg-stone/15 text-stone",
  blocked: "bg-stone/15 text-stone",
};

const STATUSES: UserStatus[] = ["pending", "approved", "rejected", "blocked"];

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin(); // moderators are redirected to /admin/content
  const { q, status: rawStatus, page } = await searchParams;
  const status = STATUSES.find((s) => s === rawStatus);
  const [counts, pending, members, dict] = await Promise.all([
    statusCounts(),
    listUsers("pending"),
    searchUsers({ q, status, page: Number(page) || 1 }),
    getDict(),
  ]);
  const t = dict.adminUi;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          {t.membership}
        </h2>
        <Link
          href="/admin/export"
          prefetch={false}
          className="rounded-full border border-field/25 px-5 py-2.5 text-sm font-semibold text-field transition-colors hover:bg-field hover:text-husk"
        >
          {t.downloadCsv}
        </Link>
      </div>

      {/* Dashboard */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: t.totalMembers, value: counts.total },
          { label: t.pendingApproval, value: counts.pending },
          { label: t.approved, value: counts.approved },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-husk-deep p-5">
            <p className="log-label">{c.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-field tabular-nums">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Role reference */}
      <div className="mt-6 grid gap-3 rounded-lg border border-line p-5 sm:grid-cols-3">
        {[
          { role: t.roleMember, can: t.canMember },
          { role: t.roleModerator, can: t.canModerator },
          { role: t.roleAdmin, can: t.canAdmin },
        ].map((r) => (
          <div key={r.role}>
            <p className="log-label text-brand">{r.role}</p>
            <p className="mt-1 text-sm text-stone">{r.can}</p>
          </div>
        ))}
      </div>

      {/* Pending approvals */}
      <h3 className="mt-12 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {t.pendingApprovals} <span className="text-stone">({pending.length})</span>
      </h3>
      {pending.length === 0 ? (
        <p className="mt-4 text-stone">{t.nothingPending}</p>
      ) : (
        <ul className="mt-5 grid gap-4">
          {pending.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-line p-5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-field">{u.full_name}</p>
                <p className="text-sm text-stone">
                  {u.designation} · {u.posting}
                </p>
                <p className="log-label mt-2 normal-case tracking-normal">
                  {u.email} · {u.mobile} · {u.address}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={approveUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-husk transition-transform hover:-translate-y-0.5">
                    {t.approve}
                  </button>
                </form>
                <form action={rejectUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <ConfirmButton
                    message={t.confirmReject}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-stone transition-colors hover:text-grain"
                  >
                    {t.reject}
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* All members */}
      <h3 className="mt-12 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {t.allMembers} <span className="text-stone">({counts.total})</span>
      </h3>
      <ListFilters
        basePath="/admin"
        q={q}
        status={status}
        statuses={t.status}
        placeholder={t.searchMembers}
        total={members.total}
        page={members.page}
        perPage={USERS_PER_PAGE}
      />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {[t.colName, t.colPosting, t.colContact, t.colRole, t.colStatus, t.colActions].map((h) => (
                <th key={h} className="log-label whitespace-nowrap py-3 pr-4 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-stone">
                  {t.noMatches}
                </td>
              </tr>
            )}
            {members.items.map((u) => (
              <tr key={u.id} className="border-b border-line/60 align-top hover:bg-husk-deep/50">
                <td className="py-3 pr-4 font-semibold text-field">{u.full_name}</td>
                <td className="py-3 pr-4 text-field/90">
                  {u.designation}
                  <span className="block text-stone">{u.posting}</span>
                </td>
                <td className="py-3 pr-4 text-field/90">
                  {u.email}
                  <span className="block tabular-nums text-stone">{u.mobile}</span>
                </td>
                <td className="py-3 pr-4">
                  {u.role === "admin" ? (
                    <span className="text-stone">{t.roles.admin}</span>
                  ) : (
                    <form action={setRole} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded border border-line bg-husk px-2 py-1 text-sm text-field"
                      >
                        <option value="member">{t.roles.member}</option>
                        <option value="moderator">{t.roles.moderator}</option>
                      </select>
                      <button className="log-label text-brand hover:underline">{t.set}</button>
                    </form>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`log-label rounded-full px-2.5 py-1 ${badge[u.status]}`}>
                    {t.status[u.status]}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {u.role !== "admin" && (
                    <div className="flex items-center gap-3">
                      {u.status === "blocked" ? (
                        <form action={unblockUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className="log-label text-brand hover:underline">{t.unblock}</button>
                        </form>
                      ) : (
                        <form action={blockUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <ConfirmButton
                            message={t.confirmBlock}
                            className="log-label text-stone hover:text-grain hover:underline"
                          >
                            {t.block}
                          </ConfirmButton>
                        </form>
                      )}
                      <form action={removeUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <ConfirmButton
                          message={t.confirmDeleteUser}
                          className="log-label text-stone hover:text-grain hover:underline"
                        >
                          {t.delete}
                        </ConfirmButton>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={members.page}
        pageCount={members.pageCount}
        basePath="/admin"
        query={{ q, status }}
      />
    </div>
  );
}
