"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const submitInput = z.object({
  shipmentId: z.string().min(1),
  priceUSD: z.coerce.number().positive().max(50_000),
  etaDays: z.coerce.number().int().min(1).max(60),
  notes: z.string().trim().max(1000).optional(),
  validDays: z.coerce.number().int().min(1).max(60),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type SubmitCustomsQuoteState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "onboarding"
    | "shipmentNotFound"
    | "shipmentNotOpen"
    | "wrongCountry"
    | "noClearanceRequested"
    | "duplicate"
    | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function submitCustomsQuoteAction(
  _prev: SubmitCustomsQuoteState | undefined,
  formData: FormData
): Promise<SubmitCustomsQuoteState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMS_AGENT") {
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

  const { shipmentId, priceUSD, etaDays, notes, validDays, locale } = parsed.data;

  const profile = await db.customsAgentProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingComplete: true, countryCode: true },
  });
  if (!profile?.onboardingComplete) return { ok: false, error: "onboarding" };

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      status: true,
      needsCustomsClearance: true,
      destinationPort: { select: { country: true } },
    },
  });
  if (!shipment) return { ok: false, error: "shipmentNotFound" };
  if (shipment.status !== "RFQ_OPEN") {
    return { ok: false, error: "shipmentNotOpen" };
  }
  if (!shipment.needsCustomsClearance) {
    return { ok: false, error: "noClearanceRequested" };
  }
  if (shipment.destinationPort.country !== profile.countryCode) {
    return { ok: false, error: "wrongCountry" };
  }

  try {
    await db.customsQuote.create({
      data: {
        shipmentId: shipment.id,
        customsAgentId: session.user.id,
        priceUSDCents: Math.round(priceUSD * 100),
        etaDays,
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
    console.error("submitCustomsQuoteAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${locale}/customs/rfq`);
  revalidatePath(`/${locale}/customs/rfq/${shipment.id}`);
  revalidatePath(`/${locale}/customer/shipments/${shipment.id}`);
  redirect(`/${locale}/customs/rfq?submitted=1`);
}
