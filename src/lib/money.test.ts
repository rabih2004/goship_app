import { describe, expect, it } from "vitest";
import { formatUSD, dollarsToCents, centsToDollars } from "./money";

describe("formatUSD", () => {
  it("formats cents as USD with no decimals", () => {
    expect(formatUSD(320_000)).toBe("$3,200");
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(99)).toBe("$1");
  });

  it("rounds half cents to the nearest whole cent then truncates fractions", () => {
    expect(formatUSD(100_50)).toBe("$101"); // $100.50 → rounds to $101
  });

  it("handles large values with thousands separators", () => {
    expect(formatUSD(1_234_567_89)).toBe("$1,234,568");
  });
});

describe("dollarsToCents", () => {
  it("converts whole dollars", () => {
    expect(dollarsToCents(10)).toBe(1000);
  });
  it("rounds half cents", () => {
    expect(dollarsToCents(10.555)).toBe(1056);
    expect(dollarsToCents(10.554)).toBe(1055);
  });
});

describe("centsToDollars", () => {
  it("is the inverse of dollarsToCents", () => {
    expect(centsToDollars(dollarsToCents(42.5))).toBe(42.5);
  });
});
