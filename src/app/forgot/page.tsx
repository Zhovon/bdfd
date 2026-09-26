import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ForgotForm from "@/components/ForgotForm";
import { org } from "@/lib/site";

export const metadata: Metadata = { title: `Forgot password — ${org.name}` };

export default function ForgotPage() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto grid max-w-3xl place-items-center px-5 py-24">
        <ForgotForm />
      </section>
      <SiteFooter />
    </>
  );
}
