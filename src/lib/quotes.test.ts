import { describe, expect, it } from "vitest";
import { rankQuotes } from "./quotes";

const q = (id: string, priceUSDCents: number, transitDays: number, rating = 0) => ({
  id,
  priceUSDCents,
  transitDays,
  forwarderRating: rating,
});

describe("rankQuotes", () => {
  it("returns [] for empty input", () => {
    expect(rankQuotes([])).toEqual([]);
  });

  it("sorts by price ascending", () => {
    const out = rankQuotes([
      q("expensive", 500_000, 10),
      q("cheap", 100_000, 20),
      q("middle", 250_000, 15),
    ]);
    expect(out.map((r) => r.id)).toEqual(["cheap", "middle", "expensive"]);
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("tags the cheapest quote even if not first by another criterion", () => {
    const out = rankQuotes([
      q("a", 100, 10),
      q("b", 200, 5),
      q("c", 300, 1),
    ]);
    expect(out.find((r) => r.id === "a")?.isCheapest).toBe(true);
    expect(out.find((r) => r.id === "b")?.isCheapest).toBe(false);
  });

  it("tags the fastest quote independently of price", () => {
    const out = rankQuotes([
      q("slow-cheap", 100, 20),
      q("fast-pricey", 1000, 5),
      q("mid", 500, 10),
    ]);
    expect(out.find((r) => r.id === "fast-pricey")?.isFastest).toBe(true);
    expect(out.find((r) => r.id === "slow-cheap")?.isFastest).toBe(false);
  });

  it("breaks price ties with transit days then rating (descending)", () => {
    const out = rankQuotes([
      q("a", 100, 10, 3.0),
      q("b", 100, 10, 4.8),
      q("c", 100, 12, 5.0),
    ]);
    // Same price + same transit → higher rating wins
    expect(out[0].id).toBe("b");
    expect(out[1].id).toBe("a");
    expect(out[2].id).toBe("c");
  });

  it("tags multiple quotes as cheapest when they tie on price", () => {
    const out = rankQuotes([
      q("a", 100, 10),
      q("b", 100, 15),
      q("c", 200, 5),
    ]);
    expect(out.filter((r) => r.isCheapest).map((r) => r.id).sort()).toEqual([
      "a",
      "b",
    ]);
  });
});
