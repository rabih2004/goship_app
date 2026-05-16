/**
 * Recurring subscriptions for Coworker + Customs Agent roles.
 *
 * Provider abstraction: SUBSCRIPTION_PROVIDER=mock|stripe.
 *   "mock"   — one-click activate, 30-day period, no real charge. Dev/demo only.
 *   "stripe" — Stripe Billing subscription via Checkout (stubbed; not wired).
 *
 * Forwarders are NOT gated by subscriptions — they pay platform commission per
 * booking via Connect. Customers don't pay platform fees. So this module's
 * `hasActiveSubscription` is only consulted in coworker/customs quote actions.
 */
import type { UserRole } from "@prisma/client";

export type SubscriptionProvider = "mock" | "stripe";

export function subscriptionProvider(): SubscriptionProvider {
  const v = (process.env.SUBSCRIPTION_PROVIDER ?? "mock").toLowerCase();
  return v === "stripe" ? "stripe" : "mock";
}

export type Tier = {
  name: string;
  priceUSDCents: number;
  /** Period length in days (monthly = 30). */
  periodDays: number;
};

/**
 * Tier catalogue. Single tier per role for v1 ("Basic"). Future "Pro" tier
 * (more leads, lower commission) is a config addition, not a refactor.
 */
export const TIERS: Record<"COWORKER" | "CUSTOMS_AGENT", Tier> = {
  COWORKER: { name: "Basic", priceUSDCents: 2900, periodDays: 30 },
  CUSTOMS_AGENT: { name: "Basic", priceUSDCents: 4900, periodDays: 30 },
};

export function tierForRole(role: UserRole): Tier | null {
  if (role === "COWORKER") return TIERS.COWORKER;
  if (role === "CUSTOMS_AGENT") return TIERS.CUSTOMS_AGENT;
  return null;
}

const DAY_MS = 86_400_000;

/**
 * True if `now` falls inside the [start, end) period AND status is ACTIVE.
 * Pure — testable without a DB row.
 */
export function isPeriodActive(
  start: Date,
  end: Date,
  status: "ACTIVE" | "EXPIRED" | "CANCELLED",
  now: Date = new Date()
): boolean {
  if (status !== "ACTIVE") return false;
  const t = now.getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function nextPeriodEnd(start: Date, periodDays: number): Date {
  return new Date(start.getTime() + periodDays * DAY_MS);
}

/**
 * Days remaining in the current period, floored at 0. Useful for badges
 * ("12 days left").
 */
export function daysRemaining(end: Date, now: Date = new Date()): number {
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}
