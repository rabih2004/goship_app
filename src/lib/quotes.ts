/**
 * Pure quote ranking — kept side-effect-free so it can be unit tested.
 * Lower score = better rank.
 */
export type RankableQuote = {
  id: string;
  priceUSDCents: number;
  transitDays: number;
  forwarderRating: number;
};

export type RankedQuote<T extends RankableQuote> = T & {
  rank: number;
  isCheapest: boolean;
  isFastest: boolean;
};

export function rankQuotes<T extends RankableQuote>(quotes: T[]): RankedQuote<T>[] {
  if (quotes.length === 0) return [];

  const cheapest = Math.min(...quotes.map((q) => q.priceUSDCents));
  const fastest = Math.min(...quotes.map((q) => q.transitDays));

  const sorted = [...quotes].sort((a, b) => {
    if (a.priceUSDCents !== b.priceUSDCents)
      return a.priceUSDCents - b.priceUSDCents;
    if (a.transitDays !== b.transitDays) return a.transitDays - b.transitDays;
    return b.forwarderRating - a.forwarderRating;
  });

  return sorted.map((q, idx) => ({
    ...q,
    rank: idx + 1,
    isCheapest: q.priceUSDCents === cheapest,
    isFastest: q.transitDays === fastest,
  }));
}
