"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isMock } from "@/lib/payments";
import { generateBookingNumber } from "@/lib/booking-numbers";
import { sendEmail, tplBookingConfirmedToForwarder } from "@/lib/email";
import { formatUSD } from "@/lib/money";

const acceptInput = z.object({
  shipmentId: z.string().min(1),
  quoteId: z.string().min(1),
  // Optional pickup leg — required when the shipment is EXW.
  pickupQuoteId: z.string().optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type AcceptQuoteState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "shipmentNotFound"
    | "quoteNotFound"
    | "shipmentNotOpen"
    | "quoteNotPending"
    | "pickupRequired"
    | "pickupNotFound"
    | "pickupNotPending"
    | "providerError"
    | "unknown";
};

export async function acceptQuoteAction(
  _prev: AcceptQuoteState | undefined,
  formData: FormData
): Promise<AcceptQuoteState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false, error: "auth" };
  }

  // Coerce empty string to undefined so the optional pickupQuoteId field
  // doesn't fail z.string().min(1) when omitted via hidden input.
  const raw = Object.fromEntries(formData.entries());
  const cleaned: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === "" && k === "pickupQuoteId") continue;
    cleaned[k] = v;
  }
  const parsed = acceptInput.safeParse(cleaned);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { shipmentId, quoteId, pickupQuoteId, locale } = parsed.data;

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      customerId: true,
      status: true,
      incoterm: true,
    },
  });
  if (!shipment || shipment.customerId !== session.user.id) {
    return { ok: false, error: "shipmentNotFound" };
  }
  if (shipment.status !== "RFQ_OPEN") {
    return { ok: false, error: "shipmentNotOpen" };
  }

  // EXW bookings MUST include a pickup quote — that's the whole point of the leg.
  if (shipment.incoterm === "EXW" && !pickupQuoteId) {
    return { ok: false, error: "pickupRequired" };
  }

  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      shipmentId: true,
      forwarderId: true,
      priceUSDCents: true,
      status: true,
    },
  });
  if (!quote || quote.shipmentId !== shipmentId) {
    return { ok: false, error: "quoteNotFound" };
  }
  if (quote.status !== "PENDING") {
    return { ok: false, error: "quoteNotPending" };
  }

  let pickup: {
    id: string;
    coworkerId: string;
    priceUSDCents: number;
  } | null = null;

  if (pickupQuoteId) {
    const p = await db.coworkerQuote.findUnique({
      where: { id: pickupQuoteId },
      select: {
        id: true,
        shipmentId: true,
        coworkerId: true,
        priceUSDCents: true,
        status: true,
      },
    });
    if (!p || p.shipmentId !== shipmentId) {
      return { ok: false, error: "pickupNotFound" };
    }
    if (p.status !== "PENDING") {
      return { ok: false, error: "pickupNotPending" };
    }
    pickup = {
      id: p.id,
      coworkerId: p.coworkerId,
      priceUSDCents: p.priceUSDCents,
    };
  }

  const pickupCents = pickup?.priceUSDCents ?? 0;
  const totalUSDCents = quote.priceUSDCents + pickupCents;
  const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 7);
  const platformFeeUSDCents = Math.round(totalUSDCents * (commissionPct / 100));

  // ---------- MOCK PROVIDER: create booking + mark paid in one transaction ----------
  if (isMock()) {
    let bookingNumber = generateBookingNumber();
    let booking;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        booking = await db.$transaction(async (tx) => {
          const created = await tx.booking.create({
            data: {
              shipmentId,
              quoteId,
              customerId: session.user.id,
              forwarderId: quote.forwarderId,
              pickupQuoteId: pickup?.id,
              coworkerId: pickup?.coworkerId,
              pickupAmountUSDCents: pickupCents,
              bookingNumber,
              totalUSDCents,
              platformFeeUSDCents,
              paidAt: new Date(),
            },
            select: { id: true, bookingNumber: true },
          });

          await tx.quote.update({
            where: { id: quoteId },
            data: { status: "ACCEPTED" },
          });
          await tx.quote.updateMany({
            where: { shipmentId, status: "PENDING", id: { not: quoteId } },
            data: { status: "REJECTED" },
          });

          if (pickup) {
            await tx.coworkerQuote.update({
              where: { id: pickup.id },
              data: { status: "ACCEPTED" },
            });
            await tx.coworkerQuote.updateMany({
              where: { shipmentId, status: "PENDING", id: { not: pickup.id } },
              data: { status: "REJECTED" },
            });
          }

          await tx.shipment.update({
            where: { id: shipmentId },
            data: { status: "BOOKED" },
          });

          await tx.trackingEvent.create({
            data: {
              bookingId: created.id,
              stage: "BOOKED",
              createdById: session.user.id,
              notes: pickup
                ? "Mock booking — sea freight + pickup leg accepted."
                : "Mock booking created (no real charge).",
            },
          });

          return created;
        });
        break;
      } catch (e) {
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code?: string }).code === "P2002"
        ) {
          bookingNumber = generateBookingNumber();
          continue;
        }
        console.error("acceptQuoteAction failed:", e);
        return { ok: false, error: "unknown" };
      }
    }

    if (!booking) return { ok: false, error: "unknown" };

    // Notify forwarder.
    const forwarder = await db.user.findUnique({
      where: { id: quote.forwarderId },
      select: { email: true, name: true },
    });
    const customer = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const forwarderPayoutCents = quote.priceUSDCents; // pickup amount goes to coworker, not forwarder
    if (forwarder?.email) {
      void sendEmail({
        to: forwarder.email,
        subject: `Booking won: ${booking.bookingNumber}`,
        text: tplBookingConfirmedToForwarder({
          bookingNumber: booking.bookingNumber,
          customerName: customer?.name ?? customer?.email ?? "A customer",
          totalUSD: formatUSD(quote.priceUSDCents),
          payoutUSD: formatUSD(forwarderPayoutCents),
          bookingUrl: `${process.env.AUTH_URL ?? "http://localhost:3000"}/${locale}/forwarder/bookings/${booking.id}`,
        }),
      }).catch((err) => console.error("forwarder booking email failed:", err));
    }

    // Notify coworker (if pickup leg).
    if (pickup) {
      const cw = await db.user.findUnique({
        where: { id: pickup.coworkerId },
        select: { email: true },
      });
      if (cw?.email) {
        void sendEmail({
          to: cw.email,
          subject: `Pickup won: ${booking.bookingNumber}`,
          text: tplBookingConfirmedToForwarder({
            bookingNumber: booking.bookingNumber,
            customerName: customer?.name ?? customer?.email ?? "A customer",
            totalUSD: formatUSD(pickup.priceUSDCents),
            payoutUSD: formatUSD(pickup.priceUSDCents),
            bookingUrl: `${process.env.AUTH_URL ?? "http://localhost:3000"}/${locale}/coworker/bookings/${booking.id}`,
          }),
        }).catch((err) => console.error("coworker booking email failed:", err));
      }
    }

    revalidatePath(`/${locale}/customer/shipments/${shipmentId}`);
    revalidatePath(`/${locale}/customer/shipments`);
    revalidatePath(`/${locale}/customer/bookings`);
    revalidatePath(`/${locale}/forwarder`);
    revalidatePath(`/${locale}/coworker`);
    redirect(`/${locale}/customer/bookings/${booking.id}?just_booked=1`);
  }

  // ---------- STRIPE PROVIDER (placeholder) ----------
  return { ok: false, error: "providerError" };
}
