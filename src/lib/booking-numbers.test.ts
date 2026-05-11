import { describe, expect, it } from "vitest";
import { generateBookingNumber, BOOKING_NUMBER_ALPHABET } from "./booking-numbers";

describe("generateBookingNumber", () => {
  it("matches the GS-YYYY-XXXXXXXX format", () => {
    const n = generateBookingNumber(new Date("2026-05-11T00:00:00Z"));
    expect(n).toMatch(/^GS-2026-[A-Z2-9]{8}$/);
  });

  it("uses the configured year from the clock", () => {
    expect(generateBookingNumber(new Date("2030-12-31T23:59:59Z"))).toMatch(
      /^GS-2030-/
    );
  });

  it("never uses ambiguous characters 0, 1, I, O", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const suffix = generateBookingNumber().slice("GS-XXXX-".length);
      for (const ch of suffix) seen.add(ch);
    }
    expect(seen.has("0")).toBe(false);
    expect(seen.has("1")).toBe(false);
    expect(seen.has("I")).toBe(false);
    expect(seen.has("O")).toBe(false);
  });

  it("produces distinct codes across many generations", () => {
    const generated = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      generated.add(generateBookingNumber());
    }
    // 32^8 ≈ 1.1T — 500 samples should never collide.
    expect(generated.size).toBe(500);
  });

  it("alphabet does not contain ambiguous chars", () => {
    expect(BOOKING_NUMBER_ALPHABET).not.toMatch(/[01IO]/);
    expect(BOOKING_NUMBER_ALPHABET.length).toBe(32);
  });
});
