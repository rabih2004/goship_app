import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  countryCodeSchema,
  signUpInput,
  signInInput,
} from "./validation";

describe("emailSchema", () => {
  it("lower-cases and trims", () => {
    const v = emailSchema.parse("  Foo@Example.COM  ");
    expect(v).toBe("foo@example.com");
  });

  it("rejects non-emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects emails over 160 chars", () => {
    const long = "a".repeat(160) + "@b.com";
    expect(emailSchema.safeParse(long).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("requires at least 8 chars", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("caps at 100 chars", () => {
    expect(passwordSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
});

describe("countryCodeSchema", () => {
  it("accepts 2-letter codes", () => {
    expect(countryCodeSchema.parse("lb")).toBe("LB");
    expect(countryCodeSchema.parse("US")).toBe("US");
    expect(countryCodeSchema.parse(" de ")).toBe("DE");
  });

  it("rejects 3-letter or numeric codes", () => {
    expect(countryCodeSchema.safeParse("USA").success).toBe(false);
    expect(countryCodeSchema.safeParse("12").success).toBe(false);
    expect(countryCodeSchema.safeParse("L").success).toBe(false);
  });
});

describe("signInInput", () => {
  it("accepts a valid pair", () => {
    expect(
      signInInput.safeParse({
        email: "x@y.com",
        password: "secret123",
      }).success
    ).toBe(true);
  });
});

describe("signUpInput discriminated union", () => {
  it("CUSTOMER form does not require companyName / countryCode", () => {
    const ok = signUpInput.safeParse({
      role: "CUSTOMER",
      email: "c@x.com",
      password: "secret123",
      name: "Test Customer",
    });
    expect(ok.success).toBe(true);
  });

  it("FORWARDER form requires companyName + countryCode", () => {
    const missing = signUpInput.safeParse({
      role: "FORWARDER",
      email: "f@x.com",
      password: "secret123",
      name: "Test Forwarder",
    });
    expect(missing.success).toBe(false);

    const good = signUpInput.safeParse({
      role: "FORWARDER",
      email: "f@x.com",
      password: "secret123",
      name: "Test Forwarder",
      companyName: "Acme Logistics",
      countryCode: "LB",
    });
    expect(good.success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const bad = signUpInput.safeParse({
      role: "PIRATE",
      email: "p@x.com",
      password: "secret123",
      name: "Captain",
    });
    expect(bad.success).toBe(false);
  });

  it("COWORKER form requires displayName + cityArea + countryCode", () => {
    const missing = signUpInput.safeParse({
      role: "COWORKER",
      email: "cw@x.com",
      password: "secret123",
      name: "Coworker User",
    });
    expect(missing.success).toBe(false);

    const good = signUpInput.safeParse({
      role: "COWORKER",
      email: "cw@x.com",
      password: "secret123",
      name: "Coworker User",
      displayName: "Beirut Pickup Co.",
      cityArea: "Beirut, Lebanon",
      countryCode: "LB",
    });
    expect(good.success).toBe(true);
  });
});
