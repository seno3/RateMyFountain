import { formatScore } from "@/lib/scoring";

// Overall score, e.g. "4.5 / 5". "–" when there are no ratings yet.
export function ScoreBadge({ score, size = "sm" }: { score: number | null; size?: "sm" | "lg" }) {
  const label = score == null ? "No ratings yet" : `${formatScore(score)} out of 5`;
  if (size === "lg") {
    return (
      <p className="flex items-baseline gap-1" aria-label={label}>
        <span className="text-5xl font-bold tabular-nums">{formatScore(score)}</span>
        <span className="text-lg text-muted">/ 5</span>
      </p>
    );
  }
  return (
    <span
      className="inline-flex min-w-12 justify-center rounded-md bg-accent px-2 py-1 text-base font-semibold tabular-nums text-ink"
      aria-label={label}
    >
      {formatScore(score)}
    </span>
  );
}
