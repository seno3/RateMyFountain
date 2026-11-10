import { Suspense } from "react";
import Link from "next/link";
import { getAllFountains, getBuildings, type FountainScore } from "@/lib/data";
import { buildMapBuildings, hasLocation } from "@/lib/map";
import { FountainCard } from "@/components/FountainCard";
import { MapView } from "@/components/map/MapView";

export const metadata = { title: "All fountains" };

const SORTS = {
  top: "Top rated",
  recent: "Recently rated",
} as const;
type Sort = keyof typeof SORTS;
type View = "list" | "map";

export default function FountainsPage(props: PageProps<"/fountains">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading fountains…</p>}>
      <Browse searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Browse({ searchParams }: Pick<PageProps<"/fountains">, "searchParams">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const sort: Sort = params.sort === "recent" ? "recent" : "top";
  const view: View = params.view === "map" ? "map" : "list";

  const [fountains, buildings] = await Promise.all([getAllFountains(), getBuildings()]);
  const buildingNames = new Map(buildings.map((b) => [b.code, b.name]));

  const needle = q.toLowerCase();
  const matches = needle
    ? fountains.filter((f) =>
        [f.short_code, f.building_code, buildingNames.get(f.building_code) ?? "", f.location_note].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    : fountains;

  // Keep the other params when switching view or sort.
  const href = (next: { view?: View; sort?: Sort }) => {
    const v = next.view ?? view;
    const s = next.sort ?? sort;
    return {
      pathname: "/fountains",
      query: { ...(q && { q }), ...(s !== "top" && { sort: s }), ...(v !== "list" && { view: v }) },
    };
  };

  return (
    <div className="space-y-4">
      <h1 className={view === "map" ? "sr-only" : "pb-2 text-3xl font-semibold tracking-tight"}>
        {view === "map" ? "Fountain map" : "All fountains"}
      </h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Plain GET form: works without JavaScript and keeps the query in the URL. */}
        <form role="search" action="/fountains" className="relative flex flex-1 items-center">
          <label htmlFor="q" className="sr-only">
            Search by building or location
          </label>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-4 size-4 text-muted" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search buildings or spots, e.g. Lawson"
            className="min-h-12 w-full rounded-full border border-line bg-surface pr-28 pl-11 shadow-card transition-colors outline-none placeholder:text-muted focus:border-accent-strong"
          />
          {sort !== "top" && <input type="hidden" name="sort" value={sort} />}
          {view !== "list" && <input type="hidden" name="view" value={view} />}
          <button
            type="submit"
            className="absolute right-1.5 min-h-9 rounded-full bg-ink px-4 text-sm font-medium text-bg transition-opacity hover:opacity-85"
          >
            Search
          </button>
        </form>

        <nav aria-label="View" className="flex shrink-0 rounded-full border border-line bg-surface p-1 shadow-card">
          {(
            [
              ["list", "List", <ListIcon key="i" />],
              ["map", "Map", <MapIcon key="i" />],
            ] as const
          ).map(([key, label, icon]) => (
            <Link
              key={key}
              href={href({ view: key })}
              aria-current={key === view ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-medium transition-colors ${
                key === view ? "bg-ink text-bg" : "text-muted hover:text-ink"
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {view === "map" ? (
        <MapPanel q={q} matches={matches} buildings={buildings} />
      ) : (
        <>
          <nav aria-label="Sort fountains" className="flex items-center gap-2">
            {(Object.keys(SORTS) as Sort[]).map((key) => (
              <Link
                key={key}
                href={href({ sort: key })}
                aria-current={key === sort ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors ${
                  key === sort
                    ? "border-accent bg-accent-soft font-medium"
                    : "border-line text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {SORTS[key]}
              </Link>
            ))}
            <span className="ml-auto text-sm text-muted tabular-nums">
              {matches.length} {matches.length === 1 ? "result" : "results"}
            </span>
          </nav>

          {matches.length === 0 ? (
            <Empty q={q} />
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2">
              {[...matches].sort(sort === "recent" ? byRecent : byTopRated).map((f, i) => (
                <li key={f.fountain_id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                  <FountainCard fountain={f} buildingName={buildingNames.get(f.building_code)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function MapPanel({
  q,
  matches,
  buildings,
}: {
  q: string;
  matches: FountainScore[];
  buildings: Awaited<ReturnType<typeof getBuildings>>;
}) {
  // With a search, show only buildings that have a matching fountain or whose name matches.
  const needle = q.toLowerCase();
  const shown = q
    ? buildings.filter(
        (b) =>
          matches.some((f) => f.building_code === b.code) ||
          b.name.toLowerCase().includes(needle) ||
          b.code.toLowerCase().includes(needle),
      )
    : buildings;
  const pins = buildMapBuildings(shown, matches);
  if (q && pins.length === 0) return <Empty q={q} />;
  return <MapView buildings={pins} hiddenCount={shown.filter((b) => !hasLocation(b)).length} />;
}

function Empty({ q }: { q: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="font-medium">{q ? `Nothing matches “${q}”.` : "No fountains yet."}</p>
      {q && (
        <Link href="/fountains" className="mt-2 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink">
          Clear search
        </Link>
      )}
    </div>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        d="M6 2.5 2.5 4v9.5L6 12l4 1.5 3.5-1.5V2.5L10 4 6 2.5Zm0 0V12m4-8v9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Rated fountains by Bayesian score (see /about), unrated ones last.
function byTopRated(a: FountainScore, b: FountainScore): number {
  if ((a.rating_count === 0) !== (b.rating_count === 0)) return a.rating_count === 0 ? 1 : -1;
  return (b.bayesian_score ?? 0) - (a.bayesian_score ?? 0) || b.rating_count - a.rating_count;
}

function byRecent(a: FountainScore, b: FountainScore): number {
  return (b.last_rated_at ?? "").localeCompare(a.last_rated_at ?? "");
}
