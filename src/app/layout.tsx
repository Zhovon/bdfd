import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Noto_Sans_Bengali, Space_Mono } from "next/font/google";
import { getLocale, getDict } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";
import "./globals.css";

// The Latin faces have no Bengali glyphs. Each is exposed as a "-latin"
// variable and globals.css composes the public --font-display/-body/-mono
// stacks as "<latin face>, <Bangla face>", so Bangla text renders in one
// consistent font on every device instead of whatever the OS falls back to.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-latin",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body-latin",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono-latin",
  display: "swap",
});

const bangla = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bangla",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getDict();
  return {
    metadataBase: new URL("https://foodofficersbd.org"),
    title: {
      default: brand.name,
      template: `%s · ${brand.short}`,
    },
    description: brand.tagline,
    applicationName: brand.short,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: brand.name,
      description: brand.tagline,
      url: "/",
    },
    twitter: {
      card: "summary",
      title: brand.name,
      description: brand.tagline,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a3b2c",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} ${mono.variable} ${bangla.variable} h-full`}
    >
      <body className="paper-grain min-h-full flex flex-col">
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
