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
      className="flex min-h-16 items-center gap-3 rounded-lg border border-line px-4 py-3 hover:bg-surface"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {fountain.short_code}
          {fountain.is_broken && <span className="ml-2 text-sm font-normal text-warning">Reported broken</span>}
        </p>
        <p className="truncate text-sm text-muted">
          {buildingName ? `${buildingName} · ` : ""}
          {floorLabel(fountain.floor)} · {fountain.location_note}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <ScoreBadge score={fountain.overall_mean} />
        <span className="text-xs text-muted">{pluralize(fountain.rating_count, "rating")}</span>
      </div>
    </Link>
  );
}
