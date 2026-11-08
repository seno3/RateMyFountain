import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif" });

export const metadata: Metadata = {
  title: { default: "Boiler Fountains", template: "%s · Boiler Fountains" },
  description: "Student-run ratings of drinking fountains around campus. Not affiliated with Purdue University.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl backdrop-saturate-150">
          <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4" aria-label="Main">
            <Link href="/" className="group flex min-h-11 items-center gap-2.5 font-semibold tracking-tight">
              <Logo className="size-7 transition-transform group-hover:-rotate-6" />
              Boiler Fountains
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/?view=map"
                className="flex min-h-11 items-center rounded-full px-3 text-muted transition-colors hover:text-ink"
              >
                Map
              </Link>
              <Link
                href="/about"
                className="flex min-h-11 items-center rounded-full px-3 text-muted transition-colors hover:text-ink"
              >
                About
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-16">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted">
            <span className="flex items-center gap-2">
              <Logo className="size-4 opacity-70" /> Boiler Fountains
            </span>
            <span>A student project. Not affiliated with Purdue University.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
