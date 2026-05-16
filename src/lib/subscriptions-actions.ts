"use server";

import { revalidatePath } from "next/cache";

import type { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";

import {
  isPeriodActive,
  nextPeriodEnd,
  subscriptionProvider,
  tierForRole,
} from "./subscriptions";

export type SubscribeState = {
  ok: boolean;
  error?: "auth" | "wrongRole" | "alreadyActive" | "providerNotWired" | "unknown";
};

/**
 * Returns the user's currently-active subscription (if any). Used in:
 *   - quote-submission gating (coworker/customs actions)
 *   - subscription page (show "active until X")
 *   - home banner (warn if missing/expired)
 *
 * Not a server action — internal helper imported by both actions and pages.
 */
export async function getActiveSubscriptionForUser(userId: string) {
  const sub = await db.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { currentPeriodEnd: "desc" },
  });
  if (!sub) return null;
  if (!isPeriodActive(sub.currentPeriodStart, sub.currentPeriodEnd, sub.status)) {
    // Lazily mark expired — saves a daily cron for v1.
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }
  return sub;
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  return (await getActiveSubscriptionForUser(userId)) !== null;
}

/**
 * Activate a subscription. Mock = instantly creates a 30-day ACTIVE row.
 * Stripe = stubbed (would create a Stripe Checkout subscription session).
 */
export async function subscribeAction(
  _prev: SubscribeState | undefined,
  formData: FormData
): Promise<SubscribeState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "auth" };

  const role = session.user.role as UserRole;
  const tier = tierForRole(role);
  if (!tier) return { ok: false, error: "wrongRole" };

  const locale = (formData.get("locale") as string) || "en";

  const existing = await getActiveSubscriptionForUser(session.user.id);
  if (existing) return { ok: false, error: "alreadyActive" };

  const provider = subscriptionProvider();
  if (provider === "stripe") {
    return { ok: false, error: "providerNotWired" };
  }

  try {
    const now = new Date();
    await db.subscription.create({
      data: {
        userId: session.user.id,
        role,
        tierName: tier.name,
        priceUSDCents: tier.priceUSDCents,
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd(now, tier.periodDays),
        status: "ACTIVE",
        provider: "mock",
      },
    });
  } catch (e) {
    console.error("subscribeAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  // Bust pages that conditionally render on subscription state.
  for (const root of ["/coworker", "/customs"]) {
    revalidatePath(`/${locale}${root}`);
    revalidatePath(`/${locale}${root}/subscription`);
    revalidatePath(`/${locale}${root}/rfq`);
  }
  return { ok: true };
}

/**
 * Cancel a subscription. v1 = mark CANCELLED but keep `currentPeriodEnd`
 * intact (paid through the end of the period), so the user retains access
 * until then via a status check — though we model that as "no longer active"
 * here for simplicity. No proration / refund logic.
 */
export async function cancelSubscriptionAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const locale = (formData.get("locale") as string) || "en";

  const active = await getActiveSubscriptionForUser(session.user.id);
  if (!active) return;

  await db.subscription.update({
    where: { id: active.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  for (const root of ["/coworker", "/customs"]) {
    revalidatePath(`/${locale}${root}`);
    revalidatePath(`/${locale}${root}/subscription`);
    revalidatePath(`/${locale}${root}/rfq`);
  }
}
