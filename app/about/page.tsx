import { BAYES_C, MIN_RATINGS_FOR_LEADERBOARD } from "@/lib/scoring";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 leading-relaxed">
      <h1 className="text-4xl font-semibold tracking-tight">About Boiler Fountains</h1>

      <section className="space-y-2 rounded-3xl border border-line bg-surface p-6 text-[15px] text-muted shadow-card [&_strong]:text-ink">
        <h2 className="text-lg font-semibold tracking-tight text-ink">What this is</h2>
        <p>
          A student-made site for finding good drinking fountains on campus. Anyone can add a
          fountain and rate it on temperature, flow, trajectory and taste.
        </p>
        <p>
          <strong>This site is not affiliated with, endorsed by or run by Purdue University.</strong>
        </p>
      </section>

      <section className="space-y-2 rounded-3xl border border-line bg-surface p-6 text-[15px] text-muted shadow-card [&_strong]:text-ink">
        <h2 className="text-lg font-semibold tracking-tight text-ink">How scores work</h2>
        <p>
          Each rating scores four things from 1 to 5. A fountain&apos;s overall score is the average
          of those four, across all its ratings. Bottle fillers are scored separately and don&apos;t
          count toward the overall score.
        </p>
        <p>
          For rankings we use a weighted score, so a fountain with one perfect rating doesn&apos;t
          beat one with forty great ones. Every fountain starts as if it already had {BAYES_C}{" "}
          average ratings, and its own ratings pull it up or down from there. A fountain needs at
          least {MIN_RATINGS_FOR_LEADERBOARD} ratings to appear on the leaderboard.
        </p>
        <p>
          A fountain is marked <em>unverified</em> until two other people have rated it or
          confirmed it exists.
        </p>
      </section>

      <section className="space-y-2 rounded-3xl border border-line bg-surface p-6 text-[15px] text-muted shadow-card [&_strong]:text-ink">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Privacy</h2>
        <p>
          We don&apos;t collect personal information. You don&apos;t need an account. When you
          rate a fountain, your browser gets a random anonymous ID so you can update your rating
          later. We don&apos;t store your IP address or location. &ldquo;Near me&rdquo; uses your
          location only in your browser, only when you tap it.
        </p>
      </section>

      <section className="space-y-2 rounded-3xl border border-line bg-surface p-6 text-[15px] text-muted shadow-card [&_strong]:text-ink">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Contact</h2>
        {/* TODO: add a real contact address or link before launch. */}
        <p>Found a problem with a fountain? Use &ldquo;Report a problem&rdquo; on its page.</p>
      </section>
    </article>
  );
}
