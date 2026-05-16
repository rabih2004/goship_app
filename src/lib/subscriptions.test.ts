import { describe, it, expect } from "vitest";

import {
  TIERS,
  daysRemaining,
  isPeriodActive,
  nextPeriodEnd,
  tierForRole,
} from "./subscriptions";

describe("tierForRole", () => {
  it("returns Basic tier for COWORKER and CUSTOMS_AGENT", () => {
    expect(tierForRole("COWORKER")).toEqual(TIERS.COWORKER);
    expect(tierForRole("CUSTOMS_AGENT")).toEqual(TIERS.CUSTOMS_AGENT);
  });

  it("returns null for non-subscribable roles", () => {
    expect(tierForRole("CUSTOMER")).toBeNull();
    expect(tierForRole("FORWARDER")).toBeNull();
    expect(tierForRole("ADMIN")).toBeNull();
  });

  it("customs tier is priced higher than coworker (more friction)", () => {
    expect(TIERS.CUSTOMS_AGENT.priceUSDCents).toBeGreaterThan(
      TIERS.COWORKER.priceUSDCents
    );
  });
});

describe("isPeriodActive", () => {
  const start = new Date("2026-05-01T00:00:00Z");
  const end = new Date("2026-05-31T00:00:00Z");

  it("true within the period when status=ACTIVE", () => {
    expect(
      isPeriodActive(start, end, "ACTIVE", new Date("2026-05-15T12:00:00Z"))
    ).toBe(true);
  });

  it("false before the period starts", () => {
    expect(
      isPeriodActive(start, end, "ACTIVE", new Date("2026-04-30T23:59:59Z"))
    ).toBe(false);
  });

  it("false at/after the period end (half-open interval)", () => {
    expect(isPeriodActive(start, end, "ACTIVE", end)).toBe(false);
  });

  it("false when status is EXPIRED or CANCELLED, even within the period", () => {
    const inside = new Date("2026-05-15T00:00:00Z");
    expect(isPeriodActive(start, end, "EXPIRED", inside)).toBe(false);
    expect(isPeriodActive(start, end, "CANCELLED", inside)).toBe(false);
  });
});

describe("nextPeriodEnd", () => {
  it("adds N days in ms (monthly = 30 days)", () => {
    const start = new Date("2026-05-01T00:00:00Z");
    const end = nextPeriodEnd(start, 30);
    expect(end.toISOString()).toBe("2026-05-31T00:00:00.000Z");
  });
});

describe("daysRemaining", () => {
  it("floors at zero for past end dates", () => {
    expect(
      daysRemaining(
        new Date("2026-04-01T00:00:00Z"),
        new Date("2026-05-01T00:00:00Z")
      )
    ).toBe(0);
  });

  it("returns floored full-day count", () => {
    expect(
      daysRemaining(
        new Date("2026-05-30T12:00:00Z"),
        new Date("2026-05-15T00:00:00Z")
      )
    ).toBe(15);
  });
});
