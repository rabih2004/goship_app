import { describe, expect, it } from "vitest";
import {
  suggestedPickupPriceCents,
  isWithinServiceRadius,
} from "./coworker-pricing";

describe("suggestedPickupPriceCents", () => {
  it("returns base fee when distance is zero", () => {
    expect(
      suggestedPickupPriceCents({
        baseFeeUSDCents: 3000,
        perKmRateUSDCents: 150,
        distanceKm: 0,
      })
    ).toBe(3000);
  });

  it("adds variable component scaled by distance", () => {
    // $30 base + $1.50/km × 20 km = $30 + $30 = $60 = 6000 cents
    expect(
      suggestedPickupPriceCents({
        baseFeeUSDCents: 3000,
        perKmRateUSDCents: 150,
        distanceKm: 20,
      })
    ).toBe(6000);
  });

  it("rounds the variable component to whole cents", () => {
    // perKm 100c × 0.005 km = 0.5 cents → rounds to 1 cent
    expect(
      suggestedPickupPriceCents({
        baseFeeUSDCents: 0,
        perKmRateUSDCents: 100,
        distanceKm: 0.005,
      })
    ).toBe(1);
  });
});

describe("isWithinServiceRadius", () => {
  it("is true at the boundary", () => {
    expect(isWithinServiceRadius({ distanceKm: 50, serviceRadiusKm: 50 })).toBe(
      true
    );
  });
  it("is true below the boundary", () => {
    expect(
      isWithinServiceRadius({ distanceKm: 49.9, serviceRadiusKm: 50 })
    ).toBe(true);
  });
  it("is false above the boundary", () => {
    expect(
      isWithinServiceRadius({ distanceKm: 50.1, serviceRadiusKm: 50 })
    ).toBe(false);
  });
});
