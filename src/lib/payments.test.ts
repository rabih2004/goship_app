import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { paymentProvider, isMock } from "./payments";

describe("paymentProvider env reader", () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.PAYMENT_PROVIDER;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = original;
  });

  it("defaults to mock when env var is missing", () => {
    delete process.env.PAYMENT_PROVIDER;
    expect(paymentProvider()).toBe("mock");
    expect(isMock()).toBe(true);
  });

  it("treats anything other than 'stripe' as mock", () => {
    process.env.PAYMENT_PROVIDER = "fake-provider";
    expect(paymentProvider()).toBe("mock");
    expect(isMock()).toBe(true);
  });

  it("recognises 'stripe' (case-insensitive)", () => {
    process.env.PAYMENT_PROVIDER = "STRIPE";
    expect(paymentProvider()).toBe("stripe");
    expect(isMock()).toBe(false);
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(paymentProvider()).toBe("stripe");
    expect(isMock()).toBe(false);
  });
});
