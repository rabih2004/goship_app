/**
 * Pure helpers for review aggregation and rating display.
 * Keep side-effect-free so they can be unit-tested without a DB.
 */

export type ScoreOnly = { score: number };

export function averageScore(reviews: ReadonlyArray<ScoreOnly>): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((a, r) => a + r.score, 0);
  return sum / reviews.length;
}

/**
 * Re-computes the new running average + count for an existing pair when
 * one more review is added. Avoids a full table re-aggregation on every
 * write — cheap and stable when reviews can only be added (no editing yet).
 */
export function appendToRunningAverage(
  prevAvg: number,
  prevCount: number,
  newScore: number
): { avg: number; count: number } {
  const count = prevCount + 1;
  const avg = (prevAvg * prevCount + newScore) / count;
  return { avg, count };
}

/**
 * Renders the integer "stars filled" count for a fractional average rating.
 * Common convention — 4.3 ⇒ 4 full stars; 4.5 rounds up to 5.
 */
export function starsFilled(avg: number): number {
  return Math.max(0, Math.min(5, Math.round(avg)));
}

/** Formats a rating for inline display. "—" when no reviews yet. */
export function formatRating(avg: number, count: number): string {
  if (count === 0) return "—";
  return `${avg.toFixed(1)} (${count})`;
}
