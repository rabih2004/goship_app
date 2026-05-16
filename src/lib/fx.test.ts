import { describe, it, expect } from "vitest";

import {
  convertFromUSDCents,
  formatMoney,
  isSupportedCurrency,
} from "./fx";

describe("convertFromUSDCents", () => {
  it("returns the same cents when target is USD (rate=1)", () => {
    expect(convertFromUSDCents(10_000, 1)).toBe(10_000);
  });

  it("converts USD → EUR (rate 1.08 USD per EUR → smaller EUR amount)", () => {
    // $100 = 10000 USD cents → 10000 / 1.08 ≈ 9259 EUR cents (€92.59)
    expect(convertFromUSDCents(10_000, 1.08)).toBe(9_259);
  });

  it("converts USD → LBP (rate 0.0000112 USD per LBP → much larger amount)", () => {
    // $1 = 100 USD cents → 100 / 0.0000112 ≈ 8,928,571 LBP minor units
    expect(convertFromUSDCents(100, 0.0000112)).toBe(8_928_571);
  });

  it("falls back to source amount when rate is invalid", () => {
    expect(convertFromUSDCents(500, 0)).toBe(500);
    expect(convertFromUSDCents(500, -1)).toBe(500);
    expect(convertFromUSDCents(500, NaN)).toBe(500);
    expect(convertFromUSDCents(500, Infinity)).toBe(500);
  });

  it("rounds to the nearest minor unit", () => {
    // 333 / 3 = 111.0 exact
    expect(convertFromUSDCents(333, 3)).toBe(111);
    // 100 / 3 = 33.333… → 33
    expect(convertFromUSDCents(100, 3)).toBe(33);
    // 200 / 3 = 66.666… → 67
    expect(convertFromUSDCents(200, 3)).toBe(67);
  });
});

describe("formatMoney", () => {
  it("renders USD with $ and 2 decimals", () => {
    expect(formatMoney(12_345, "USD", "en")).toMatch(/\$123\.45/);
  });

  it("renders JPY without decimals (Intl knows JPY=0-minor-unit)", () => {
    const out = formatMoney(123_400, "JPY", "en");
    expect(out).toMatch(/¥/);
    expect(out).not.toMatch(/\./);
  });

  it("falls back to 'CODE amount' for unknown currency", () => {
    // 'XXX' is reserved by ISO 4217 as 'no currency' — Intl may render it as
    // 'XXX 100.00'. Just ensure no throw and the major value appears.
    const out = formatMoney(10_000, "ZZZ", "en");
    expect(out).toMatch(/100/);
  });
});

describe("isSupportedCurrency", () => {
  it("accepts known codes", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("AED")).toBe(true);
  });

  it("rejects unknown codes", () => {
    expect(isSupportedCurrency("ZZZ")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency("usd")).toBe(false); // case-sensitive on purpose
  });
});
