import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LoginForm from "@/components/LoginForm";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).pageTitles.login };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  const t = await getDict();
  return (
    <>
      <SiteHeader />
      <section className="mx-auto grid max-w-3xl place-items-center px-5 py-24">
        <LoginForm notice={reset ? t.auth.resetSent : undefined} />
      </section>
      <SiteFooter />
    </>
  );
}
