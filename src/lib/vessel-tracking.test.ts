import { describe, it, expect } from "vitest";

import {
  interpolateGreatCircle,
  mockVesselPosition,
  type VesselQuery,
} from "./vessel-tracking";

const BEY = { lat: 33.9, lng: 35.5 };
const HAM = { lat: 53.55, lng: 9.99 };

function q(overrides: Partial<VesselQuery> = {}): VesselQuery {
  return {
    origin: BEY,
    destination: HAM,
    events: [],
    transitDays: 18,
    now: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  };
}

describe("interpolateGreatCircle", () => {
  it("returns origin at fraction 0", () => {
    const p = interpolateGreatCircle(BEY.lat, BEY.lng, HAM.lat, HAM.lng, 0);
    expect(p.lat).toBeCloseTo(BEY.lat, 4);
    expect(p.lng).toBeCloseTo(BEY.lng, 4);
  });

  it("returns destination at fraction 1", () => {
    const p = interpolateGreatCircle(BEY.lat, BEY.lng, HAM.lat, HAM.lng, 1);
    expect(p.lat).toBeCloseTo(HAM.lat, 4);
    expect(p.lng).toBeCloseTo(HAM.lng, 4);
  });

  it("returns a midpoint between the two on fraction 0.5", () => {
    const p = interpolateGreatCircle(BEY.lat, BEY.lng, HAM.lat, HAM.lng, 0.5);
    expect(p.lat).toBeGreaterThan(BEY.lat);
    expect(p.lat).toBeLessThan(HAM.lat);
    // Longitude transits roughly between the two
    expect(p.lng).toBeLessThan(BEY.lng);
    expect(p.lng).toBeGreaterThan(HAM.lng);
  });

  it("clamps fractions outside [0, 1]", () => {
    const under = interpolateGreatCircle(BEY.lat, BEY.lng, HAM.lat, HAM.lng, -1);
    const over = interpolateGreatCircle(BEY.lat, BEY.lng, HAM.lat, HAM.lng, 2);
    expect(under.lat).toBeCloseTo(BEY.lat, 4);
    expect(over.lat).toBeCloseTo(HAM.lat, 4);
  });
});

describe("mockVesselPosition", () => {
  it("returns null when no DEPARTED event", () => {
    expect(mockVesselPosition(q({ events: [] }))).toBeNull();
    expect(
      mockVesselPosition(
        q({
          events: [{ stage: "BOOKED", occurredAt: new Date("2026-05-01") }],
        })
      )
    ).toBeNull();
  });

  it("returns null after CLEARED — no vessel to track anymore", () => {
    expect(
      mockVesselPosition(
        q({
          events: [
            { stage: "DEPARTED", occurredAt: new Date("2026-05-01") },
            { stage: "ARRIVED", occurredAt: new Date("2026-05-19") },
            { stage: "CLEARED", occurredAt: new Date("2026-05-20") },
          ],
        })
      )
    ).toBeNull();
  });

  it("snaps to destination when ARRIVED", () => {
    const p = mockVesselPosition(
      q({
        events: [
          { stage: "DEPARTED", occurredAt: new Date("2026-05-01") },
          { stage: "ARRIVED", occurredAt: new Date("2026-05-19") },
        ],
      })
    )!;
    expect(p.fraction).toBe(1);
    expect(p.lat).toBeCloseTo(HAM.lat, 4);
    expect(p.lng).toBeCloseTo(HAM.lng, 4);
  });

  it("interpolates mid-transit at fraction 0.5", () => {
    const departedAt = new Date("2026-05-01T00:00:00Z");
    const now = new Date("2026-05-10T00:00:00Z"); // 9 days into 18-day transit
    const p = mockVesselPosition(
      q({
        events: [{ stage: "DEPARTED", occurredAt: departedAt }],
        now,
      })
    )!;
    expect(p.fraction).toBeCloseTo(0.5, 2);
    expect(p.lat).toBeGreaterThan(BEY.lat);
    expect(p.lat).toBeLessThan(HAM.lat);
  });

  it("clamps fraction at 1 when transit time exceeded but no ARRIVED yet", () => {
    const p = mockVesselPosition(
      q({
        events: [
          { stage: "DEPARTED", occurredAt: new Date("2026-01-01T00:00:00Z") },
        ],
        now: new Date("2026-12-31T00:00:00Z"),
      })
    )!;
    expect(p.fraction).toBe(1);
  });

  it("returns null when either port lacks coordinates", () => {
    expect(
      mockVesselPosition(
        q({
          origin: { lat: null, lng: null },
          events: [{ stage: "DEPARTED", occurredAt: new Date("2026-05-01") }],
        })
      )
    ).toBeNull();
  });

  it("tags source as 'mock'", () => {
    const p = mockVesselPosition(
      q({
        events: [{ stage: "DEPARTED", occurredAt: new Date("2026-05-05") }],
      })
    )!;
    expect(p.source).toBe("mock");
  });
});
