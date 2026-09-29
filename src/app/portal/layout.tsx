import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
import MemberShell from "@/components/MemberShell";
import { requireUser, isStaff } from "@/lib/session";
import { countUnread } from "@/lib/notifications";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getDict()).pageTitles.members,
    robots: { index: false, follow: false },
  };
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await countUnread(user.id);
  return (
    <MemberShell
      user={{ name: user.full_name, role: user.role, isAdmin: isStaff(user) }}
      unread={unread}
    >
      {children}
    </MemberShell>
  );
}
