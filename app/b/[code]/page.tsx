import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuilding, getFountainsInBuilding } from "@/lib/data";
import { compareFloors, floorLabel, pluralize } from "@/lib/format";
import { hasLocation } from "@/lib/map";
import { FountainCard } from "@/components/FountainCard";

export default function BuildingPage(props: PageProps<"/b/[code]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading building…</p>}>
      <Building params={props.params} />
    </Suspense>
  );
}

async function Building({ params }: Pick<PageProps<"/b/[code]">, "params">) {
  const { code } = await params;
  const building = await getBuilding(code.toUpperCase());
  if (!building) notFound();

  const fountains = await getFountainsInBuilding(building.code);
  const floors = [...new Set(fountains.map((f) => f.floor))].sort(compareFloors);

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-ink">
        <span aria-hidden="true">←</span> All fountains
      </Link>

      <header className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface px-6 py-8 shadow-card">
        <div aria-hidden="true" className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-accent/30 blur-3xl dark:bg-accent/10" />
        <p className="font-mono text-sm font-semibold text-accent-strong">{building.code}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{building.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{pluralize(fountains.length, "fountain")}</span>
          {floors.length > 0 && <span>· {pluralize(floors.length, "floor")}</span>}
          {hasLocation(building) && (
            <Link
              href={`/?view=map&q=${encodeURIComponent(building.code)}`}
              className="ml-auto inline-flex min-h-10 items-center rounded-full border border-line px-4 font-medium text-ink transition-colors hover:border-line-strong"
            >
              Show on map
            </Link>
          )}
        </div>
      </header>

      {floors.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center text-muted">
          No fountains in this building yet.
        </p>
      ) : (
        floors.map((floor) => (
          <section key={floor} aria-labelledby={`floor-${floor}`} className="space-y-3">
            <h2 id={`floor-${floor}`} className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
              {floorLabel(floor)}
            </h2>
            <ul className="grid gap-2.5 md:grid-cols-2">
              {fountains
                .filter((f) => f.floor === floor)
                .map((f) => (
                  <li key={f.fountain_id}>
                    <FountainCard fountain={f} />
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
