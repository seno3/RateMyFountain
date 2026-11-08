import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Logo className="size-12" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Dry spell.</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find that page or fountain.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg hover:opacity-85"
      >
        Back to all fountains
      </Link>
    </div>
  );
}
