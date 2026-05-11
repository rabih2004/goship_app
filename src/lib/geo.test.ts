import { describe, expect, it } from "vitest";
import { haversineKm, nearestK, roundKm, toRadians } from "./geo";

describe("toRadians", () => {
  it("converts degrees to radians", () => {
    expect(toRadians(0)).toBe(0);
    expect(toRadians(180)).toBeCloseTo(Math.PI, 6);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(33.9, 35.51, 33.9, 35.51)).toBe(0);
  });

  it("is symmetric", () => {
    const a = haversineKm(33.9, 35.51, 53.55, 9.99); // Beirut → Hamburg
    const b = haversineKm(53.55, 9.99, 33.9, 35.51);
    expect(a).toBeCloseTo(b, 4);
  });

  it("matches a known great-circle distance (Beirut → Hamburg ~2965 km)", () => {
    const d = haversineKm(33.9, 35.51, 53.55, 9.99);
    expect(d).toBeGreaterThan(2900);
    expect(d).toBeLessThan(3050);
  });

  it("matches a short-distance example (Beirut → Tripoli LB ~64 km)", () => {
    const d = haversineKm(33.9, 35.51, 34.45, 35.81);
    expect(d).toBeGreaterThan(55);
    expect(d).toBeLessThan(75);
  });
});

describe("nearestK", () => {
  const ports = [
    { unlocode: "LBBEY", lat: 33.9, lng: 35.51 },
    { unlocode: "LBKYE", lat: 34.45, lng: 35.81 },
    { unlocode: "DEHAM", lat: 53.55, lng: 9.99 },
    { unlocode: "FRMRS", lat: 43.3, lng: 5.37 },
    { unlocode: "NULL_ONE", lat: null, lng: null },
  ];

  it("returns the K closest items with distances populated", () => {
    const result = nearestK(ports, 33.9, 35.51, 3);
    expect(result.length).toBe(3);
    expect(result[0].unlocode).toBe("LBBEY");
    expect(result[1].unlocode).toBe("LBKYE");
    expect(result[0].distanceKm).toBe(0);
    expect(result[1].distanceKm).toBeGreaterThan(0);
  });

  it("skips items missing lat/lng", () => {
    const result = nearestK(ports, 33.9, 35.51, 5);
    expect(result.find((r) => r.unlocode === "NULL_ONE")).toBeUndefined();
  });

  it("orders results ascending by distance", () => {
    const result = nearestK(ports, 33.9, 35.51, 4);
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i].distanceKm).toBeGreaterThanOrEqual(result[i - 1].distanceKm);
    }
  });
});

describe("roundKm", () => {
  it("rounds to one decimal place", () => {
    expect(roundKm(1234.567)).toBe(1234.6);
    expect(roundKm(0)).toBe(0);
    expect(roundKm(0.04)).toBe(0);
    expect(roundKm(0.05)).toBe(0.1);
  });
});
