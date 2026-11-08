"use client";

import dynamic from "next/dynamic";
import type { MapBuilding } from "@/lib/map";

// MapLibre needs the browser (WebGL), so it loads client-side only, and only on the map view.
const FountainMap = dynamic(() => import("./FountainMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapSkeleton() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-track text-sm text-muted">
      Loading map…
    </div>
  );
}

export function MapView({ buildings, hiddenCount }: { buildings: MapBuilding[]; hiddenCount: number }) {
  return (
    <div className="relative h-[calc(100dvh-12rem)] min-h-[440px] overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <FountainMap buildings={buildings} hiddenCount={hiddenCount} />
    </div>
  );
}
