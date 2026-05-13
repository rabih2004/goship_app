import { describe, expect, it } from "vitest";
import {
  averageScore,
  appendToRunningAverage,
  starsFilled,
  formatRating,
} from "./reviews";

describe("averageScore", () => {
  it("returns 0 for empty input", () => {
    expect(averageScore([])).toBe(0);
  });
  it("computes the arithmetic mean", () => {
    expect(averageScore([{ score: 5 }, { score: 3 }, { score: 4 }])).toBeCloseTo(
      4,
      6
    );
  });
});

describe("appendToRunningAverage", () => {
  it("starts from zero on the first review", () => {
    const r = appendToRunningAverage(0, 0, 5);
    expect(r).toEqual({ avg: 5, count: 1 });
  });
  it("matches a recomputed average exactly", () => {
    let avg = 0;
    let count = 0;
    const scores = [5, 3, 4, 5, 2];
    for (const s of scores) {
      const r = appendToRunningAverage(avg, count, s);
      avg = r.avg;
      count = r.count;
    }
    expect(avg).toBeCloseTo(3.8, 6);
    expect(count).toBe(5);
  });
});

describe("starsFilled", () => {
  it("rounds half-up", () => {
    expect(starsFilled(0)).toBe(0);
    expect(starsFilled(2.4)).toBe(2);
    expect(starsFilled(2.5)).toBe(3);
    expect(starsFilled(4.7)).toBe(5);
  });
  it("clamps to [0, 5]", () => {
    expect(starsFilled(-1)).toBe(0);
    expect(starsFilled(99)).toBe(5);
  });
});

describe("formatRating", () => {
  it("shows em-dash with no reviews", () => {
    expect(formatRating(0, 0)).toBe("—");
  });
  it("one-decimal format with count", () => {
    expect(formatRating(4.333, 12)).toBe("4.3 (12)");
  });
});
