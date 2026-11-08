import { formatScore } from "@/lib/scoring";

// One category's mean as a bar from 1 to 5. The number is always shown as text,
// so the bar itself is decoration (aria-hidden).
export function CategoryBar({
  label,
  low,
  high,
  value,
}: {
  label: string;
  low: string;
  high: string;
  value: number | null;
}) {
  const percent = value == null ? 0 : ((value - 1) / 4) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono tabular-nums text-muted">{formatScore(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
        <div
          className="h-full rounded-full bg-linear-to-r from-accent to-accent-strong transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
