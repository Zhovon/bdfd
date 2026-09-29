import type { Metadata } from "next";
import { getDict } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ForgotForm from "@/components/ForgotForm";
import { captchaSiteKey } from "@/lib/captcha";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).pageTitles.forgot };
}

export default function ForgotPage() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto grid max-w-3xl place-items-center px-5 py-24">
        <ForgotForm siteKey={captchaSiteKey()} />
      </section>
      <SiteFooter />
    </>
  );
}
