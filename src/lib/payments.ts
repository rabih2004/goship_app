/**
 * Payment-provider feature flag. Set via PAYMENT_PROVIDER env var.
 *
 * "mock"   — skip real charges. Forwarder onboarding flips a flag.
 *            Booking checkout creates a Booking row directly. For dev/demo only.
 * "stripe" — real Stripe Connect Express + Stripe Checkout. Requires keys.
 *
 * Sprint 6 will introduce a proper PaymentProvider adapter interface.
 * For now we just branch on isMock() in the few action handlers that need it.
 */

export type PaymentProvider = "mock" | "stripe";

export function paymentProvider(): PaymentProvider {
  const v = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  return v === "stripe" ? "stripe" : "mock";
}

export function isMock(): boolean {
  return paymentProvider() === "mock";
}
