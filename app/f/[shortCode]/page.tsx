import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getBuilding, getFountain, getRecentRatings } from "@/lib/data";
import { daysAgo, floorLabel, pluralize } from "@/lib/format";
import { CATEGORIES, formatScore, overallScore, type Tag } from "@/lib/scoring";
import { Banner } from "@/components/Banner";
import { CategoryBar } from "@/components/CategoryBar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { TagChip } from "@/components/TagChip";

export default function FountainPage(props: PageProps<"/f/[shortCode]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading fountain…</p>}>
      <Fountain params={props.params} />
    </Suspense>
  );
}

async function Fountain({ params }: Pick<PageProps<"/f/[shortCode]">, "params">) {
  const { shortCode } = await params;
  // "last rated N days ago" depends on the current time, so render at request time.
  // The data itself is still cached (see lib/data.ts).
  await connection();
  const fountain = await getFountain(shortCode.toUpperCase());
  if (!fountain) notFound();

  const [building, recent] = await Promise.all([
    getBuilding(fountain.building_code),
    getRecentRatings(fountain.fountain_id),
  ]);
  const means = {
    temperature: fountain.temperature_mean,
    flow: fountain.flow_mean,
    trajectory: fountain.trajectory_mean,
    taste: fountain.taste_mean,
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted">
          <Link href={`/b/${fountain.building_code}`} className="underline underline-offset-4">
            {building?.name ?? fountain.building_code}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">{fountain.short_code}</h1>
        <p>
          {fountain.building_code} · {floorLabel(fountain.floor)} · {fountain.location_note}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-sm">
          {!fountain.verified && (
            <span className="rounded-full border border-line px-3 py-0.5 text-muted">Unverified</span>
          )}
          {fountain.has_bottle_filler && (
            <span className="rounded-full border border-line px-3 py-0.5">Has bottle filler</span>
          )}
        </div>
      </header>

      {fountain.is_broken && (
        <Banner tone="warning">
          <strong>Reported broken.</strong> Someone recently said this fountain isn&apos;t working.
        </Banner>
      )}

      <section aria-label="Scores" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <ScoreBadge score={fountain.overall_mean} size="lg" />
          <p className="text-right text-sm text-muted">
            {fountain.rating_count === 0 ? (
              "No ratings yet"
            ) : (
              <>
                {pluralize(fountain.rating_count, "rating")}
                {fountain.last_rated_at && (
                  <>
                    <br />
                    last rated {daysAgo(fountain.last_rated_at)}
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <div className="space-y-3">
          {CATEGORIES.map((c) => (
            <CategoryBar key={c.key} label={c.label} low={c.low} high={c.high} value={means[c.key]} />
          ))}
          {fountain.has_bottle_filler && (
            <CategoryBar
              label="Bottle filler"
              low="Slow"
              high="Fast"
              value={fountain.bottle_filler_count > 0 ? fountain.bottle_filler_mean : null}
            />
          )}
        </div>

        {fountain.top_tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Most used tags">
            {fountain.top_tags.map((t) => (
              <li key={t.tag}>
                <TagChip tag={t.tag} count={t.count} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        {/* Writing comes in phase 2. */}
        <button
          type="button"
          disabled
          className="min-h-12 w-full rounded-lg bg-accent px-4 text-lg font-semibold text-ink disabled:opacity-60"
        >
          Rate this fountain (coming soon)
        </button>
        <p className="flex justify-center gap-6 text-sm text-muted">
          <span>Confirm it&apos;s here</span>
          <span>Report a problem</span>
        </p>
      </section>

      <section aria-labelledby="recent" className="space-y-2">
        <h2 id="recent" className="text-lg font-semibold">
          Recent ratings
        </h2>
        {recent.length === 0 ? (
          <p className="text-muted">No ratings yet. Be the first once rating opens.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-semibold tabular-nums">
                  {formatScore(
                    overallScore({
                      temperature: r.temperature!,
                      flow: r.flow!,
                      trajectory: r.trajectory!,
                      taste: r.taste!,
                    }),
                  )}
                </span>
                <span className="flex flex-1 flex-wrap gap-1 text-sm">
                  {(r.tags ?? []).map((t) => <TagChip key={t} tag={t as Tag} />)}
                </span>
                <span className="text-sm text-muted">{r.updated_at && daysAgo(r.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
