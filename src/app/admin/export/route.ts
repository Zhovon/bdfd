import { getSessionUser, isAdmin } from "@/lib/session";
import { listUsers } from "@/lib/db";

const csvCell = (v: string | number | null) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const members = await listUsers();
  const header = [
    "id", "full_name", "email", "mobile", "address",
    "designation", "posting", "role", "status", "created_at",
  ];
  const rows = members.map((m) =>
    [
      m.id, m.full_name, m.email, m.mobile, m.address,
      m.designation, m.posting, m.role, m.status, m.created_at.toISOString(),
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="portal-members-${date}.csv"`,
    },
  });
}
