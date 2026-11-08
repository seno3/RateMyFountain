import Link from "next/link";
import type { FountainScore } from "@/lib/data";
import { floorLabel, pluralize } from "@/lib/format";
import { ScoreBadge } from "./ScoreBadge";

// One row in a fountain list. The whole row is the link (big tap target).
export function FountainCard({
  fountain,
  buildingName,
}: {
  fountain: FountainScore;
  buildingName?: string;
}) {
  return (
    <Link
      href={`/f/${fountain.short_code}`}
      className="group flex min-h-18 items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card transition-all hover:-translate-y-px hover:border-line-strong"
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[15px] font-semibold tracking-tight">{fountain.short_code}</span>
          {fountain.has_bottle_filler && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium">Bottle filler</span>
          )}
          {fountain.is_broken && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning">
              Reported broken
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {buildingName ? `${buildingName} · ` : ""}
          {floorLabel(fountain.floor)} · {fountain.location_note}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <ScoreBadge score={fountain.overall_mean} />
        <span className="text-xs text-muted">{pluralize(fountain.rating_count, "rating")}</span>
      </div>
      <svg
        viewBox="0 0 16 16"
        className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      >
        <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
