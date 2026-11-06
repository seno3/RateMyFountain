import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Boiler Fountains", template: "%s · Boiler Fountains" },
  description: "Student-run ratings of drinking fountains around campus. Not affiliated with Purdue University.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-2xl items-center justify-between px-4" aria-label="Main">
            <Link href="/" className="flex min-h-11 items-center text-lg font-bold">
              Boiler Fountains
            </Link>
            <Link href="/about" className="flex min-h-11 items-center px-2 underline-offset-4 hover:underline">
              About
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line px-4 py-4 text-center text-sm text-muted">
          A student project. Not affiliated with Purdue University.
        </footer>
      </body>
    </html>
  );
}
