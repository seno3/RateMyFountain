import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBuilding, getFountainsInBuilding } from "@/lib/data";
import { compareFloors, floorLabel } from "@/lib/format";
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
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-muted">{building.code}</p>
        <h1 className="text-2xl font-bold">{building.name}</h1>
      </header>

      {floors.length === 0 ? (
        <p className="rounded-lg border border-line px-4 py-6 text-center text-muted">
          No fountains in this building yet.
        </p>
      ) : (
        floors.map((floor) => (
          <section key={floor} aria-labelledby={`floor-${floor}`} className="space-y-2">
            <h2 id={`floor-${floor}`} className="text-lg font-semibold">
              {floorLabel(floor)}
            </h2>
            <ul className="space-y-2">
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
