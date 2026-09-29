import Link from "next/link";
import Emblem from "./Emblem";
import { org } from "@/lib/site";

type Tone = "onLight" | "onDark";
type Size = "sm" | "md";

/**
 * The identity lockup: the rice-ear crest beside a two-line wordmark (a mono
 * eyebrow over a display title). Use `onDark` over the green hero/footer bands.
 * The crest chip stays green-on-cream in both tones so the mark reads anywhere.
 */
export default function Brand({
  href = "/",
  title = org.short,
  eyebrow = org.eyebrow,
  tone = "onLight",
  size = "md",
  className = "",
}: {
  href?: string;
  title?: string;
  eyebrow?: string;
  tone?: Tone;
  size?: Size;
  className?: string;
}) {
  const chip = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const mark = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const titleSize = size === "sm" ? "text-sm" : "text-base sm:text-lg";
  const titleColor = tone === "onDark" ? "text-husk" : "text-field";
  const eyebrowColor = tone === "onDark" ? "text-grain" : "text-brand";

  return (
    <Link
      href={href}
      aria-label={`${org.name} — home`}
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      <span
        className={`seal relative grid ${chip} shrink-0 place-items-center rounded-[5px] bg-field text-husk transition-transform group-hover:-translate-y-0.5`}
        aria-hidden
      >
        <Emblem className={mark} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`log-label block text-[0.58rem] ${eyebrowColor}`}>{eyebrow}</span>
        <span
          className={`block font-[family-name:var(--font-display)] font-bold tracking-tight ${titleSize} ${titleColor}`}
        >
          {title}
        </span>
      </span>
    </Link>
  );
}
