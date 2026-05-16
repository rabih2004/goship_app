import { describe, it, expect } from "vitest";

import {
  computeInsuranceCents,
  formatRatePercent,
} from "./insurance";

describe("computeInsuranceCents", () => {
  it("returns 0 when wantsInsurance is false", () => {
    expect(computeInsuranceCents(false, 1_000_000)).toBe(0);
  });

  it("returns 0 when cargo value is null/undefined/zero/negative", () => {
    expect(computeInsuranceCents(true, null)).toBe(0);
    expect(computeInsuranceCents(true, undefined)).toBe(0);
    expect(computeInsuranceCents(true, 0)).toBe(0);
    expect(computeInsuranceCents(true, -100)).toBe(0);
  });

  it("computes 1.5% by default (150 bps)", () => {
    // $10,000 cargo → $150 premium = 15_000 cents
    expect(computeInsuranceCents(true, 1_000_000)).toBe(15_000);
  });

  it("rounds UP fractional cents — platform never undercharges", () => {
    // 1 cent cargo × 150 bps = 0.015 cents → ceil → 1
    expect(computeInsuranceCents(true, 1)).toBe(1);
    // 67 cents × 150 bps = 1.005 cents → ceil → 2
    expect(computeInsuranceCents(true, 67)).toBe(2);
  });

  it("honors custom rate", () => {
    // 100 bps = 1% — $5,000 × 1% = $50 = 5_000 cents
    expect(computeInsuranceCents(true, 500_000, 100)).toBe(5_000);
    // 250 bps = 2.5% — $5,000 × 2.5% = $125 = 12_500 cents
    expect(computeInsuranceCents(true, 500_000, 250)).toBe(12_500);
  });
});

describe("formatRatePercent", () => {
  it("formats whole-percent values without decimals", () => {
    expect(formatRatePercent(100)).toBe("1%");
    expect(formatRatePercent(200)).toBe("2%");
  });

  it("formats fractional values with 2 decimals", () => {
    expect(formatRatePercent(150)).toBe("1.50%");
    expect(formatRatePercent(225)).toBe("2.25%");
  });
});
