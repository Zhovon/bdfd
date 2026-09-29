import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from "next/font/google";
import { org } from "@/lib/site";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://foodofficersbd.org"),
  title: {
    default: org.name,
    template: `%s · ${org.short}`,
  },
  description: org.tagline,
  applicationName: org.short,
  openGraph: {
    type: "website",
    siteName: org.name,
    title: org.name,
    description: org.tagline,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: org.name,
    description: org.tagline,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a3b2c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="paper-grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
