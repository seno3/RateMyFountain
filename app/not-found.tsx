import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p>We couldn&apos;t find that page or fountain.</p>
      <Link href="/" className="underline underline-offset-4">
        Back to all fountains
      </Link>
    </div>
  );
}
