import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { org, modules } from "@/lib/site";
import { getSessionUser, isStaff } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();
  const authed = Boolean(user);
  const isAdmin = isStaff(user);
  const moduleHref = (slug: string) => (authed ? `/portal/${slug}` : "/login");

  return (
    <>
      <SiteHeader authed={authed} isAdmin={isAdmin} />

      {/* Hero — the thesis: colleagues who stay a family across every posting */}
      <section className="contour relative overflow-hidden bg-field text-husk">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="log-label rise rise-1 text-grain">
            Departmental officers only · members&apos; portal
          </p>
          <h1 className="rise rise-2 mt-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
            One service.
            <br />
            <span className="text-grain">One community.</span>
          </h1>
          <p className="rise rise-3 mt-7 max-w-xl text-lg leading-relaxed text-husk/70">
            A private welfare and community platform for the officers of the service — travel,
            mutual support, a blood directory and notices. Access opens to verified members once
            an administrator approves your registration.
          </p>
          <div className="rise rise-4 mt-9 flex flex-wrap items-center gap-4">
            {authed ? (
              <>
                <Link
                  href="/portal"
                  className="rounded-full bg-brand px-7 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5"
                >
                  Go to members&apos; area →
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-full border border-husk/30 px-7 py-3.5 font-semibold text-husk transition-colors hover:bg-husk hover:text-field"
                  >
                    Admin panel
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="rounded-full bg-brand px-7 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5"
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-husk/30 px-7 py-3.5 font-semibold text-husk transition-colors hover:bg-husk hover:text-field"
                >
                  Log in →
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Waypoints — the four wings, tagged with service-style codes */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex items-end justify-between gap-6 border-b border-line pb-5">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-field sm:text-4xl">
            Inside the portal
          </h2>
          <p className="log-label hidden max-w-xs text-right sm:block">
            {authed ? "You're signed in — open any module." : "Members-only content. Register and get approved to see it."}
          </p>
        </div>

        <ul className="mt-4">
          {modules.map((m) => (
            <li key={m.slug}>
              <Link
                href={moduleHref(m.slug)}
                className="group grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-1 border-b border-line py-7 sm:grid-cols-[auto_1fr_auto] sm:gap-y-0"
              >
                <span className="log-label text-brand">{m.code}</span>
                <div>
                  <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-field transition-transform duration-300 group-hover:translate-x-1.5 sm:text-3xl">
                    {m.title}
                  </span>
                  <p className="mt-1 max-w-md text-sm text-stone">{m.blurb}</p>
                </div>
                <span className="log-label col-start-2 text-stone/70 sm:col-start-3 sm:self-center">
                  {authed ? "open →" : "members only"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </>
  );
}
