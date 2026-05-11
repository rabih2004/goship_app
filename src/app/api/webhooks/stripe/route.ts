import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { constructWebhookEvent, isAccountReady } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver.
 *
 * Local dev: run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
 * and paste the printed `whsec_...` into STRIPE_WEBHOOK_SECRET in .env.
 *
 * Events we currently handle:
 *   - account.updated  → keep ForwarderProfile.onboardingComplete in sync
 *
 * Sprint 6 will add:
 *   - checkout.session.completed
 *   - payment_intent.succeeded
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("Webhook signature verification failed:", msg);
    return new NextResponse(`Invalid signature: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      default:
        // Acknowledge unhandled events so Stripe doesn't retry them.
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const profile = await db.forwarderProfile.findUnique({
    where: { stripeAccountId: account.id },
    select: { userId: true, onboardingComplete: true },
  });
  if (!profile) {
    console.warn(`account.updated for unknown stripeAccountId=${account.id}`);
    return;
  }

  const ready = isAccountReady(account);
  if (ready === profile.onboardingComplete) return; // no-op

  await db.forwarderProfile.update({
    where: { userId: profile.userId },
    data: { onboardingComplete: ready },
  });
  console.log(
    `Forwarder ${profile.userId} onboardingComplete: ${profile.onboardingComplete} → ${ready}`
  );
}
