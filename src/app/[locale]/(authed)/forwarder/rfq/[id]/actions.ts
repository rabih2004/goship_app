"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dollarsToCents } from "@/lib/money";
import { createNotification } from "@/lib/notifications";

const submitInput = z.object({
  shipmentId: z.string().min(1),
  priceUSD: z.coerce.number().positive().max(1_000_000),
  transitDays: z.coerce.number().int().min(1).max(180),
  carrierName: z.string().trim().min(1).max(80),
  validDays: z.coerce.number().int().min(1).max(60),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type SubmitQuoteState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "shipmentNotFound"
    | "duplicate"
    | "noLane"
    | "stripeIncomplete"
    | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function submitQuoteAction(
  _prev: SubmitQuoteState | undefined,
  formData: FormData
): Promise<SubmitQuoteState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") {
    return { ok: false, error: "auth" };
  }

  const parsed = submitInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const { shipmentId, priceUSD, transitDays, carrierName, validDays, locale } =
    parsed.data;

  const profile = await db.forwarderProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingComplete: true },
  });
  if (!profile?.onboardingComplete) {
    return { ok: false, error: "stripeIncomplete" };
  }

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      status: true,
      customerId: true,
      originPortUnlocode: true,
      destinationPortUnlocode: true,
    },
  });
  if (!shipment || shipment.status !== "RFQ_OPEN") {
    return { ok: false, error: "shipmentNotFound" };
  }

  const lane = await db.lane.findFirst({
    where: {
      forwarderId: session.user.id,
      active: true,
      originPortUnlocode: shipment.originPortUnlocode,
      destinationPortUnlocode: shipment.destinationPortUnlocode,
    },
    select: { id: true },
  });
  if (!lane) return { ok: false, error: "noLane" };

  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + validDays);

  try {
    await db.quote.create({
      data: {
        shipmentId,
        forwarderId: session.user.id,
        priceUSDCents: dollarsToCents(priceUSD),
        transitDays,
        carrierName,
        validUntil,
        status: "PENDING",
      },
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { ok: false, error: "duplicate" };
    }
    return { ok: false, error: "unknown" };
  }

  await createNotification({
    userId: shipment.customerId,
    type: "NEW_QUOTE_RECEIVED",
    shipmentId,
    bodyText: `${shipment.originPortUnlocode} → ${shipment.destinationPortUnlocode} · ${carrierName}`,
    linkPath: `/customer/shipments/${shipmentId}`,
  });

  redirect(`/${locale}/forwarder/rfq`);
}
