import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ResetForm from "@/components/ResetForm";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).pageTitles.reset };
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = (await getDict()).reset;
  return (
    <>
      <SiteHeader />
      <section className="mx-auto grid max-w-3xl place-items-center px-5 py-24">
        {token ? (
          <ResetForm token={token} />
        ) : (
          <div className="w-full max-w-sm text-center">
            <p className="log-label text-grain">{t.missingToken}</p>
            <p className="mt-3 text-field">{t.incomplete}</p>
            <Link href="/forgot" className="mt-6 inline-block font-semibold text-brand hover:underline">
              {t.requestNew}
            </Link>
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
