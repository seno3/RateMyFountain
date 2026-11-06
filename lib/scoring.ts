// Scoring constants and helpers shared by the UI and tests.
// The SQL side (supabase/migrations/*_scoring.sql) mirrors BAYES_C and TAGS;
// tests/unit/scoring.test.ts checks the two stay in sync.

/** Bayesian prior weight: how many "average" ratings every fountain starts with. */
export const BAYES_C = 5;

/** Minimum number of ratings to appear on the leaderboard. */
export const MIN_RATINGS_FOR_LEADERBOARD = 3;

/** Max tags per rating. */
export const MAX_TAGS = 3;

export const TAGS = [
  "ice_cold",
  "lukewarm",
  "weak_stream",
  "strong_stream",
  "splashy",
  "metallic_taste",
  "filter_needs_change",
  "fast_filler",
  "slow_filler",
  "hidden_gem",
  "broken",
] as const;

export type Tag = (typeof TAGS)[number];

export const TAG_LABELS: Record<Tag, string> = {
  ice_cold: "Ice cold",
  lukewarm: "Lukewarm",
  weak_stream: "Weak stream",
  strong_stream: "Strong stream",
  splashy: "Splashy",
  metallic_taste: "Metallic taste",
  filter_needs_change: "Filter needs change",
  fast_filler: "Fast filler",
  slow_filler: "Slow filler",
  hidden_gem: "Hidden gem",
  broken: "Broken",
};

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}

/** Same rule as the DB check constraint: known tags only, at most MAX_TAGS. */
export function isValidTagList(tags: readonly string[]): boolean {
  return tags.length <= MAX_TAGS && tags.every(isTag);
}

export const CATEGORIES = [
  { key: "temperature", label: "Temperature", low: "Warm", high: "Ice cold" },
  { key: "flow", label: "Flow", low: "Trickle", high: "Strong" },
  { key: "trajectory", label: "Trajectory", low: "Face-on-spout", high: "Perfect arc" },
  { key: "taste", label: "Taste", low: "Gross", high: "Clean" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

/** Overall score of one rating: mean of the 4 core categories (bottle filler excluded). */
export function overallScore(r: Record<CategoryKey, number>): number {
  return (r.temperature + r.flow + r.trajectory + r.taste) / 4;
}

/**
 * Bayesian average used for ranking: (C * m + sum) / (C + n).
 * m = global mean overall score, sum/n = this fountain's overall-score sum and count.
 * The DB computes this in the fountain_scores view; this copy exists for tests and docs.
 */
export function bayesianScore(sum: number, n: number, m: number, c: number = BAYES_C): number {
  return (c * m + sum) / (c + n);
}

/** One decimal, as shown on fountain pages. */
export function formatScore(score: number | null | undefined): string {
  return score == null ? "–" : score.toFixed(1);
}
