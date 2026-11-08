import { Suspense } from "react";
import Link from "next/link";
import { getAllFountains, getBuildings, type Building, type FountainScore } from "@/lib/data";
import { buildMapBuildings, hasLocation } from "@/lib/map";
import { floorLabel } from "@/lib/format";
import { CATEGORIES, formatScore } from "@/lib/scoring";
import { MapView } from "@/components/map/MapView";
import { FountainStage, type StageStats } from "@/components/fountain3d/FountainStage";

export const metadata = { title: { absolute: "Boiler Fountains" } };

const SORTS = { top: "score", recent: "recency" } as const;
type Sort = keyof typeof SORTS;

export default function HomePage(props: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const sort: Sort = params.sort === "recent" ? "recent" : "top";
  const [fountains, buildings] = await Promise.all([getAllFountains(), getBuildings()]);
  const names = new Map(buildings.map((b) => [b.code, b.name]));

  const needle = q.toLowerCase();
  const matches = needle
    ? fountains.filter((f) =>
        [f.short_code, f.building_code, names.get(f.building_code) ?? "", f.location_note].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      )
    : fountains;

  if (params.view === "map") return <MapScreen q={q} matches={matches} buildings={buildings} />;

  return (
    // data-home switches the page to the monochrome theme and hides the global header (see globals.css).
    <div data-home>
      <FountainStage stats={stageStats(fountains, buildings, names)} />
      <Index q={q} sort={sort} total={fountains.length} rows={[...matches].sort(sort === "recent" ? byRecent : byTopRated)} names={names} />
    </div>
  );
}

// ---------------------------------------------------------------------
// The Index: every fountain as a row in a register
// ---------------------------------------------------------------------

function Index({
  q,
  sort,
  total,
  rows,
  names,
}: {
  q: string;
  sort: Sort;
  total: number;
  rows: FountainScore[];
  names: Map<string, string>;
}) {
  const href = (s: Sort) => ({ pathname: "/", query: { ...(q && { q }), ...(s !== "top" && { sort: s }) }, hash: "index" });

  return (
    <section id="index" aria-labelledby="index-title" className="scroll-mt-0 pt-24 sm:pt-32">
      <div className="grid gap-8 border-b border-white/15 pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-white/45 uppercase">
            Appendix A — {total} entries
          </p>
          <h1 id="index-title" className="mt-3 font-serif text-7xl leading-[0.9] tracking-[-0.03em] sm:text-8xl">
            The <span className="italic">Index</span>
          </h1>
        </div>

        <div className="space-y-3 font-mono text-[11px] tracking-[0.14em] uppercase md:text-right">
          {/* Plain GET form: works without JavaScript and keeps the query in the URL. */}
          <form role="search" action="/#index" className="flex items-baseline gap-3 md:justify-end">
            <label htmlFor="q" className="text-white/45">
              Filter
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="building, code, spot"
              autoComplete="off"
              className="w-56 border-b border-white/25 bg-transparent pb-1 font-mono text-[13px] tracking-normal text-white normal-case outline-none placeholder:text-white/25 focus:border-white"
            />
            {sort !== "top" && <input type="hidden" name="sort" value={sort} />}
          </form>
          <p className="flex items-baseline gap-3 md:justify-end">
            <span className="text-white/45">Sort</span>
            {(Object.keys(SORTS) as Sort[]).map((key) => (
              <Link
                key={key}
                href={href(key)}
                aria-current={key === sort ? "page" : undefined}
                className={key === sort ? "text-white underline underline-offset-4" : "text-white/45 hover:text-white"}
              >
                {SORTS[key]}
              </Link>
            ))}
            <span className="text-white/20">/</span>
            <Link href="/?view=map" className="text-white/45 hover:text-white">
              Map →
            </Link>
          </p>
        </div>
      </div>

      {/* Column key */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[3.5rem_8.5rem_1fr_5.5rem_4.5rem_4rem] gap-4 px-3 pt-4 pb-2 font-mono text-[10px] tracking-[0.16em] text-white/35 uppercase md:grid"
      >
        <span>No.</span>
        <span>Code</span>
        <span>Location</span>
        <span>Signature</span>
        <span className="text-right">Score</span>
        <span className="text-right">n</span>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-white/10 py-16 text-center font-mono text-sm text-white/60">
          No entries match “{q}”.{" "}
          <Link href="/#index" className="text-white underline underline-offset-4">
            Clear filter
          </Link>
        </p>
      ) : (
        <ol>
          {rows.map((f, i) => (
            <li key={f.fountain_id}>
              <Row fountain={f} rank={i + 1} building={names.get(f.building_code)} />
            </li>
          ))}
        </ol>
      )}

      <p className="mt-10 font-mono text-[10px] leading-relaxed tracking-[0.14em] text-white/35 uppercase">
        Signature: temperature · flow · trajectory · taste, each out of 5. Scores are Bayesian-adjusted;{" "}
        <Link href="/about" className="text-white/60 underline underline-offset-4 hover:text-white">
          method
        </Link>
        .
      </p>
    </section>
  );
}

function Row({ fountain: f, rank, building }: { fountain: FountainScore; rank: number; building?: string }) {
  const rated = f.rating_count > 0;
  return (
    <Link
      href={`/f/${f.short_code}`}
      className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 border-t border-white/10 px-3 py-4 transition-colors duration-150 hover:bg-white hover:text-black md:grid-cols-[3.5rem_8.5rem_1fr_5.5rem_4.5rem_4rem]"
    >
      <span className="font-mono text-xs text-white/35 tabular-nums group-hover:text-black/40">
        {String(rank).padStart(3, "0")}
      </span>

      <span className="flex items-baseline gap-2 font-mono text-[15px] tracking-tight">
        <span className={f.is_broken ? "line-through decoration-1" : ""}>{f.short_code}</span>
        {f.has_bottle_filler && (
          <abbr title="Bottle filler" className="text-[10px] text-white/45 no-underline group-hover:text-black/50">
            +BF
          </abbr>
        )}
      </span>

      <span className="col-span-2 col-start-2 row-start-2 min-w-0 truncate text-sm text-white/60 group-hover:text-black/60 md:col-span-1 md:col-start-auto md:row-start-auto">
        {building ?? f.building_code} · {floorLabel(f.floor)} · {f.location_note}
        {f.is_broken && <span className="ml-2 font-mono text-[10px] tracking-[0.14em] uppercase">Out of order</span>}
      </span>

      <Signature fountain={f} />

      <span className="row-span-2 text-right font-serif text-4xl leading-none tabular-nums md:row-span-1">
        {rated ? formatScore(f.overall_mean) : <span className="text-white/25 group-hover:text-black/25">—</span>}
      </span>

      <span className="hidden text-right font-mono text-xs text-white/45 tabular-nums group-hover:text-black/50 md:block">
        {f.rating_count}
      </span>
    </Link>
  );
}

// Four thin bars: the fountain's category means, readable at a glance.
function Signature({ fountain }: { fountain: FountainScore }) {
  const values = CATEGORIES.map((c) => fountain[`${c.key}_mean`] as number | null);
  const label = CATEGORIES.map((c, i) => `${c.label} ${formatScore(values[i])}`).join(", ");
  return (
    <span className="hidden h-8 items-end gap-[5px] md:flex" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span key={CATEGORIES[i].key} className="relative h-full w-[5px] bg-white/10 group-hover:bg-black/10">
          <span
            className="absolute inset-x-0 bottom-0 bg-white transition-[height] duration-500 group-hover:bg-black"
            style={{ height: v == null ? 0 : `${(v / 5) * 100}%` }}
          />
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------
// Stats for the 3D stage
// ---------------------------------------------------------------------

function stageStats(fountains: FountainScore[], buildings: Building[], names: Map<string, string>): StageStats {
  const ratings = fountains.reduce((n, f) => n + f.rating_count, 0);
  // Campus averages weighted by number of ratings.
  const mean = (key: "temperature_mean" | "flow_mean" | "trajectory_mean" | "taste_mean") => {
    let sum = 0;
    let n = 0;
    for (const f of fountains) {
      const v = f[key];
      if (v != null && f.rating_count > 0) {
        sum += v * f.rating_count;
        n += f.rating_count;
      }
    }
    return formatScore(n ? sum / n : null);
  };
  const best = [...fountains].filter((f) => f.rating_count > 0).sort(byTopRated)[0];
  return {
    fountains: fountains.length,
    buildings: new Set(fountains.map((f) => f.building_code)).size || buildings.length,
    ratings,
    means: {
      temperature: mean("temperature_mean"),
      flow: mean("flow_mean"),
      trajectory: mean("trajectory_mean"),
      taste: mean("taste_mean"),
    },
    best: best
      ? { code: best.short_code, score: formatScore(best.overall_mean), place: names.get(best.building_code) ?? best.building_code }
      : null,
  };
}

// ---------------------------------------------------------------------
// Map view
// ---------------------------------------------------------------------

function MapScreen({ q, matches, buildings }: { q: string; matches: FountainScore[]; buildings: Building[] }) {
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
  return (
    <div className="space-y-4">
      <h1 className="sr-only">Fountain map</h1>
      <div className="flex flex-wrap items-baseline justify-between gap-3 font-mono text-[11px] tracking-[0.14em] uppercase">
        <Link href="/#index" className="text-muted hover:text-ink">
          ← The Index
        </Link>
        <form role="search" action="/" className="flex items-baseline gap-3">
          <label htmlFor="q" className="text-muted">
            Filter
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="building, code, spot"
            className="w-56 border-b border-line-strong bg-transparent pb-1 text-[13px] tracking-normal normal-case outline-none focus:border-ink"
          />
          <input type="hidden" name="view" value="map" />
        </form>
      </div>
      {q && pins.length === 0 ? (
        <p className="py-16 text-center font-mono text-sm text-muted">No entries match “{q}”.</p>
      ) : (
        <MapView buildings={pins} hiddenCount={shown.filter((b) => !hasLocation(b)).length} />
      )}
    </div>
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
