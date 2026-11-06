import { Suspense } from "react";
import Link from "next/link";
import { getAllFountains, getBuildings, type FountainScore } from "@/lib/data";
import { FountainCard } from "@/components/FountainCard";

export const metadata = { title: { absolute: "Boiler Fountains" } };

const SORTS = {
  top: "Top rated",
  recent: "Recently rated",
} as const;
type Sort = keyof typeof SORTS;

export default function HomePage(props: PageProps<"/">) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Find a good drinking fountain</h1>
      <Suspense fallback={<p className="text-muted">Loading fountains…</p>}>
        <FountainList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function FountainList({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const sort: Sort = params.sort === "recent" ? "recent" : "top";

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
  const sorted = [...matches].sort(sort === "recent" ? byRecent : byTopRated);

  return (
    <>
      {/* Plain GET form: works without JavaScript and keeps the query in the URL. */}
      <form role="search" action="/" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search by building or location
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Building or location, e.g. Lawson"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line px-3"
        />
        {sort !== "top" && <input type="hidden" name="sort" value={sort} />}
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-ink">
          Search
        </button>
      </form>

      <nav aria-label="Sort fountains" className="flex gap-2">
        {(Object.keys(SORTS) as Sort[]).map((key) => (
          <Link
            key={key}
            href={{ pathname: "/", query: { ...(q && { q }), ...(key !== "top" && { sort: key }) } }}
            aria-current={key === sort ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-full border px-4 text-sm ${
              key === sort ? "border-ink bg-ink text-white" : "border-line"
            }`}
          >
            {SORTS[key]}
          </Link>
        ))}
      </nav>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-line px-4 py-6 text-center text-muted">
          {q ? `No fountains match “${q}”.` : "No fountains yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((f) => (
            <li key={f.fountain_id}>
              <FountainCard fountain={f} buildingName={buildingNames.get(f.building_code)} />
            </li>
          ))}
        </ul>
      )}
    </>
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
