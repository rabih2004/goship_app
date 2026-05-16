"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { haversineKm, roundKm } from "@/lib/geo";
import { isWithinServiceRadius } from "@/lib/coworker-pricing";
import { hasActiveSubscription } from "@/lib/subscriptions-actions";
import { createNotification } from "@/lib/notifications";

const submitInput = z.object({
  shipmentId: z.string().min(1),
  priceUSD: z.coerce.number().positive().max(50_000),
  pickupTime: z.coerce.date().optional(),
  vehicleNote: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  validDays: z.coerce.number().int().min(1).max(60),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type SubmitCoworkerQuoteState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "onboarding"
    | "subscription"
    | "shipmentNotFound"
    | "shipmentNotOpen"
    | "outOfRadius"
    | "duplicate"
    | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function submitCoworkerQuoteAction(
  _prev: SubmitCoworkerQuoteState | undefined,
  formData: FormData
): Promise<SubmitCoworkerQuoteState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "COWORKER") {
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

  const { shipmentId, priceUSD, pickupTime, vehicleNote, notes, validDays, locale } =
    parsed.data;

  const profile = await db.coworkerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      onboardingComplete: true,
      serviceCenterLat: true,
      serviceCenterLng: true,
      serviceRadiusKm: true,
    },
  });
  if (!profile?.onboardingComplete) return { ok: false, error: "onboarding" };
  if (profile.serviceCenterLat == null || profile.serviceCenterLng == null) {
    return { ok: false, error: "onboarding" };
  }

  if (!(await hasActiveSubscription(session.user.id))) {
    return { ok: false, error: "subscription" };
  }

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      status: true,
      incoterm: true,
      customerId: true,
      factoryLat: true,
      factoryLng: true,
      factoryCity: true,
    },
  });
  if (!shipment) return { ok: false, error: "shipmentNotFound" };
  if (shipment.status !== "RFQ_OPEN" || shipment.incoterm !== "EXW") {
    return { ok: false, error: "shipmentNotOpen" };
  }
  if (shipment.factoryLat == null || shipment.factoryLng == null) {
    return { ok: false, error: "shipmentNotFound" };
  }

  const distanceKm = roundKm(
    haversineKm(
      profile.serviceCenterLat,
      profile.serviceCenterLng,
      shipment.factoryLat,
      shipment.factoryLng
    )
  );
  if (
    !isWithinServiceRadius({
      distanceKm,
      serviceRadiusKm: profile.serviceRadiusKm,
    })
  ) {
    return { ok: false, error: "outOfRadius" };
  }

  try {
    await db.coworkerQuote.create({
      data: {
        shipmentId: shipment.id,
        coworkerId: session.user.id,
        distanceKm,
        priceUSDCents: Math.round(priceUSD * 100),
        pickupTime: pickupTime ?? null,
        vehicleNote: vehicleNote || null,
        notes: notes || null,
        validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
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
    console.error("submitCoworkerQuoteAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  await createNotification({
    userId: shipment.customerId,
    type: "NEW_QUOTE_RECEIVED",
    shipmentId: shipment.id,
    bodyText: `Pickup · ${shipment.factoryCity ?? "factory"} · ${distanceKm} km`,
    linkPath: `/customer/shipments/${shipment.id}`,
  });

  revalidatePath(`/${locale}/coworker/rfq`);
  revalidatePath(`/${locale}/coworker/rfq/${shipment.id}`);
  revalidatePath(`/${locale}/customer/shipments/${shipment.id}`);
  redirect(`/${locale}/coworker/rfq?submitted=1`);
}
