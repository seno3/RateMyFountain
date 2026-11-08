import { formatScore, scoreTone, type ScoreTone } from "@/lib/scoring";

export const toneText: Record<ScoreTone, string> = {
  good: "text-good",
  okay: "text-okay",
  poor: "text-poor",
  none: "text-none",
};

export const toneChip: Record<ScoreTone, string> = {
  good: "bg-good-soft text-good",
  okay: "bg-okay-soft text-okay",
  poor: "bg-poor-soft text-poor",
  none: "bg-none-soft text-none",
};

// Overall score. "sm" is a tinted pill for lists; "lg" is a ring for the fountain page.
// "–" when there are no ratings yet.
export function ScoreBadge({ score, size = "sm" }: { score: number | null; size?: "sm" | "lg" }) {
  const label = score == null ? "No ratings yet" : `${formatScore(score)} out of 5`;
  const tone = scoreTone(score);

  if (size === "lg") {
    const r = 52;
    const circumference = 2 * Math.PI * r;
    const fraction = score == null ? 0 : (score - 1) / 4;
    return (
      <div className="relative size-36 shrink-0" role="img" aria-label={label}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-track" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            className={`${toneText[tone]} transition-[stroke-dashoffset] duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatScore(score)}</span>
          <span className="text-xs text-muted">out of 5</span>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${toneChip[tone]}`}
      aria-label={label}
    >
      {formatScore(score)}
    </span>
  );
}
