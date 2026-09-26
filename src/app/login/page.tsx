import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LoginForm from "@/components/LoginForm";
import { org } from "@/lib/site";

export const metadata: Metadata = { title: `Log in — ${org.name}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return (
    <>
      <SiteHeader />
      <section className="mx-auto grid max-w-3xl place-items-center px-5 py-24">
        <LoginForm notice={reset ? "Your password has been reset — please log in." : undefined} />
      </section>
      <SiteFooter />
    </>
  );
}
