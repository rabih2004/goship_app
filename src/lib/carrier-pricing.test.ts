import { describe, it, expect } from "vitest";

import { mockBaselineRate, type BaselineQuery } from "./carrier-pricing";

// Beirut → Hamburg as a reference long lane (~5000 km great-circle).
const BEY = { unlocode: "LBBEY", lat: 33.9, lng: 35.5 };
const HAM = { unlocode: "DEHAM", lat: 53.55, lng: 9.99 };

function q(overrides: Partial<BaselineQuery> = {}): BaselineQuery {
  return {
    origin: BEY,
    destination: HAM,
    containerType: "TWENTY_FT",
    ...overrides,
  };
}

describe("mockBaselineRate", () => {
  it("returns null when either port lacks coordinates", () => {
    expect(
      mockBaselineRate(
        q({ origin: { unlocode: "XXXXX", lat: null, lng: null } })
      )
    ).toBeNull();
    expect(
      mockBaselineRate(
        q({ destination: { unlocode: "XXXXX", lat: null, lng: null } })
      )
    ).toBeNull();
  });

  it("is deterministic — same input always same output", () => {
    const a = mockBaselineRate(q());
    const b = mockBaselineRate(q());
    expect(a).toEqual(b);
  });

  it("produces a sensible price for a 5000 km 20ft lane", () => {
    const r = mockBaselineRate(q())!;
    // ~$1500–$5000 plausibility band for spot rates
    expect(r.priceUSDCents).toBeGreaterThan(150_000);
    expect(r.priceUSDCents).toBeLessThan(500_000);
  });

  it("scales by container size: LCL < 20ft < 40ft < 40HC", () => {
    const lcl = mockBaselineRate(q({ containerType: "LCL" }))!;
    const tw = mockBaselineRate(q({ containerType: "TWENTY_FT" }))!;
    const fo = mockBaselineRate(q({ containerType: "FORTY_FT" }))!;
    const hc = mockBaselineRate(q({ containerType: "FORTY_HC" }))!;
    expect(lcl.priceUSDCents).toBeLessThan(tw.priceUSDCents);
    expect(tw.priceUSDCents).toBeLessThan(fo.priceUSDCents);
    expect(fo.priceUSDCents).toBeLessThan(hc.priceUSDCents);
  });

  it("floors transit at 7 days for short hops", () => {
    const r = mockBaselineRate(
      q({
        origin: BEY,
        destination: { unlocode: "CYLMS", lat: 34.67, lng: 33.04 },
      })
    )!;
    expect(r.transitDays).toBeGreaterThanOrEqual(7);
  });

  it("scales transit roughly with distance (above the 7-day floor)", () => {
    const short = mockBaselineRate(q())!;
    // Shanghai → Los Angeles ≈ 10,500 km — well above the floor.
    const long = mockBaselineRate(
      q({
        origin: { unlocode: "CNSHA", lat: 31.23, lng: 121.47 },
        destination: { unlocode: "USLAX", lat: 33.74, lng: -118.27 },
      })
    )!;
    expect(long.transitDays).toBeGreaterThan(short.transitDays);
  });

  it("picks a stable carrier for the same lane", () => {
    const a = mockBaselineRate(q())!;
    const b = mockBaselineRate(q())!;
    expect(a.carrierName).toBe(b.carrierName);
  });

  it("tags the source as 'mock'", () => {
    expect(mockBaselineRate(q())!.source).toBe("mock");
  });
});
