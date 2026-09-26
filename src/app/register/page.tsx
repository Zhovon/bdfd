import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RegisterForm from "@/components/RegisterForm";
import { org } from "@/lib/site";
import { captchaSiteKey } from "@/lib/captcha";

export const metadata: Metadata = { title: `Register — ${org.name}` };

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <p className="log-label text-brand">Membership request</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-field">
          Register as an officer
        </h1>
        <p className="mt-4 max-w-xl text-stone">
          Enter your service details. An administrator will verify them against official records and
          approve your account — you&apos;ll get an email once access is granted. Already approved?{" "}
          <Link href="/login" className="font-semibold text-brand underline-offset-2 hover:underline">
            Log in
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
