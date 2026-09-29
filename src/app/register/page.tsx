import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RegisterForm from "@/components/RegisterForm";
import { captchaSiteKey } from "@/lib/captcha";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).pageTitles.register };
}

export default async function RegisterPage() {
  const t = (await getDict()).register;
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <p className="log-label text-brand">{t.kicker}</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-field">
          {t.title}
        </h1>
        <p className="mt-4 max-w-xl text-stone">
          {t.intro}{" "}
          <Link href="/login" className="font-semibold text-brand underline-offset-2 hover:underline">
            {t.logIn}
          </Link>
          .
        </p>
        <div className="mt-10">
          <RegisterForm siteKey={captchaSiteKey()} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
