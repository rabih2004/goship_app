"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createNotification, createNotifications } from "@/lib/notifications";

const REASONS = [
  "DAMAGED_CARGO",
  "LATE_DELIVERY",
  "WRONG_CARGO",
  "DOCUMENTATION",
  "BILLING",
  "OTHER",
] as const;

const openInput = z.object({
  bookingId: z.string().min(1),
  reason: z.enum(REASONS),
  description: z.string().trim().min(10).max(4000),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type OpenDisputeState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "notAParty"
    | "alreadyOpen"
    | "bookingNotFound"
    | "unknown";
  fieldErrors?: Record<string, string>;
};

/**
 * Customer OR forwarder can open a dispute. Coworker / customs agent CANNOT —
 * by design they have a narrower contract that doesn't run to delivery; if
 * they have a problem they should escalate to the forwarder.
 *
 * One OPEN dispute per booking at a time. Resolved disputes don't block a new
 * one from being raised later.
 */
export async function openDisputeAction(
  _prev: OpenDisputeState | undefined,
  formData: FormData
): Promise<OpenDisputeState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "auth" };

  const parsed = openInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }
  const { bookingId, reason, description, locale } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, customerId: true, forwarderId: true },
  });
  if (!booking) return { ok: false, error: "bookingNotFound" };

  // Only the customer or forwarder for THIS booking may open a dispute.
  const userId = session.user.id;
  if (userId !== booking.customerId && userId !== booking.forwarderId) {
    return { ok: false, error: "notAParty" };
  }

  const existingOpen = await db.dispute.findFirst({
    where: { bookingId, status: "OPEN" },
    select: { id: true },
  });
  if (existingOpen) return { ok: false, error: "alreadyOpen" };

  try {
    await db.dispute.create({
      data: {
        bookingId,
        openedByUserId: userId,
        reason,
        description,
        status: "OPEN",
      },
    });
  } catch (e) {
    console.error("openDisputeAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  // Notify the OTHER party (whoever didn't open it). Both will then see
  // the dispute panel on their booking detail page.
  const otherPartyId =
    userId === booking.customerId ? booking.forwarderId : booking.customerId;
  const otherRoot =
    userId === booking.customerId ? "forwarder" : "customer";
  await createNotification({
    userId: otherPartyId,
    type: "DISPUTE_OPENED",
    bookingId,
    bodyText: reason,
    linkPath: `/${otherRoot}/bookings/${bookingId}`,
  });

  for (const root of ["/customer/bookings", "/forwarder/bookings", "/admin"]) {
    revalidatePath(`/${locale}${root}/${bookingId}`);
    revalidatePath(`/${locale}${root}`);
  }
  return { ok: true };
}

const resolveInput = z.object({
  disputeId: z.string().min(1),
  resolution: z.enum(["RESOLVED", "REJECTED"]),
  adminNote: z.string().trim().min(1).max(4000),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type ResolveDisputeState = {
  ok: boolean;
  error?: "auth" | "validation" | "notFound" | "unknown";
  fieldErrors?: Record<string, string>;
};

/**
 * Admin marks a dispute RESOLVED (we sided with the complainant) or REJECTED
 * (we didn't). Either way the dispute is closed; the note is shown verbatim
 * to both parties.
 */
export async function resolveDisputeAction(
  _prev: ResolveDisputeState | undefined,
  formData: FormData
): Promise<ResolveDisputeState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "auth" };
  }

  const parsed = resolveInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }
  const { disputeId, resolution, adminNote, locale } = parsed.data;

  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    select: {
      id: true,
      bookingId: true,
      booking: { select: { customerId: true, forwarderId: true } },
    },
  });
  if (!dispute) return { ok: false, error: "notFound" };

  try {
    await db.dispute.update({
      where: { id: disputeId },
      data: {
        status: resolution,
        adminNote,
        resolvedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("resolveDisputeAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  // Notify both parties. Each one's link points at their own role's view.
  await createNotifications([
    {
      userId: dispute.booking.customerId,
      type: "DISPUTE_RESOLVED",
      bookingId: dispute.bookingId,
      bodyText: resolution,
      linkPath: `/customer/bookings/${dispute.bookingId}`,
    },
    {
      userId: dispute.booking.forwarderId,
      type: "DISPUTE_RESOLVED",
      bookingId: dispute.bookingId,
      bodyText: resolution,
      linkPath: `/forwarder/bookings/${dispute.bookingId}`,
    },
  ]);

  for (const root of ["/customer/bookings", "/forwarder/bookings", "/admin"]) {
    revalidatePath(`/${locale}${root}/${dispute.bookingId}`);
    revalidatePath(`/${locale}${root}`);
  }
  return { ok: true };
}
