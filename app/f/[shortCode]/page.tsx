import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getBuilding, getFountain, getRecentRatings } from "@/lib/data";
import { daysAgo, floorLabel, pluralize } from "@/lib/format";
import { CATEGORIES, overallScore, type Tag } from "@/lib/scoring";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/b/${fountain.building_code}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <span aria-hidden="true">←</span> {building?.name ?? fountain.building_code}
      </Link>

      <header className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <div aria-hidden="true" className="absolute -top-24 -left-16 -z-10 size-72 rounded-full bg-accent/30 blur-3xl dark:bg-accent/10" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="font-mono text-3xl font-semibold tracking-tight">{fountain.short_code}</h1>
            <p className="text-muted">
              {floorLabel(fountain.floor)} · {fountain.location_note}
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-medium">
              {fountain.verified ? (
                <span className="rounded-full bg-good-soft px-3 py-1 text-good">Verified</span>
              ) : (
                <span className="rounded-full bg-none-soft px-3 py-1 text-muted">Unverified</span>
              )}
              {fountain.has_bottle_filler && (
                <span className="rounded-full bg-accent-soft px-3 py-1">Bottle filler</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ScoreBadge score={fountain.overall_mean} size="lg" />
            <p className="text-sm text-muted sm:hidden">
              {fountain.rating_count === 0 ? "No ratings yet" : pluralize(fountain.rating_count, "rating")}
            </p>
          </div>
        </div>
        <p className="mt-4 hidden text-sm text-muted sm:block">
          {fountain.rating_count === 0
            ? "No ratings yet"
            : `${pluralize(fountain.rating_count, "rating")}${
                fountain.last_rated_at ? ` · last rated ${daysAgo(fountain.last_rated_at)}` : ""
              }`}
        </p>
      </header>

      {fountain.is_broken && (
        <Banner tone="warning">
          <strong>Reported broken.</strong> Someone recently said this fountain isn&apos;t working.
        </Banner>
      )}

      <section aria-labelledby="breakdown" className="rounded-3xl border border-line bg-surface p-6 shadow-card">
        <h2 id="breakdown" className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Breakdown
        </h2>
        <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
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
          <ul className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5" aria-label="Most used tags">
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
          className="min-h-13 w-full rounded-full bg-accent px-4 text-base font-semibold text-accent-ink shadow-card disabled:opacity-60"
        >
          Rate this fountain (coming soon)
        </button>
        <p className="flex justify-center gap-6 text-sm text-muted">
          <span>Confirm it&apos;s here</span>
          <span>Report a problem</span>
        </p>
      </section>

      <section aria-labelledby="recent" className="space-y-3">
        <h2 id="recent" className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Recent ratings
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center text-muted">
            No ratings yet. Be the first once rating opens.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <ScoreBadge
                  score={overallScore({
                    temperature: r.temperature!,
                    flow: r.flow!,
                    trajectory: r.trajectory!,
                    taste: r.taste!,
                  })}
                />
                <span className="flex flex-1 flex-wrap gap-1">
                  {(r.tags ?? []).map((t) => <TagChip key={t} tag={t as Tag} />)}
                </span>
                <span className="text-xs text-muted">{r.updated_at && daysAgo(r.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
