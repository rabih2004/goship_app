"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appendToRunningAverage } from "@/lib/reviews";

const submitInput = z.object({
  bookingId: z.string().min(1),
  ratedUserId: z.string().min(1),
  ratedRole: z.enum(["FORWARDER", "COWORKER", "CUSTOMS_AGENT", "CUSTOMER"]),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type SubmitReviewState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "notDelivered"
    | "notAParty"
    | "wrongCounterparty"
    | "duplicate"
    | "unknown";
};

export async function submitReviewAction(
  _prev: SubmitReviewState | undefined,
  formData: FormData
): Promise<SubmitReviewState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "auth" };

  const parsed = submitInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "validation" };
  const { bookingId, ratedUserId, ratedRole, score, comment, locale } =
    parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      customerId: true,
      forwarderId: true,
      coworkerId: true,
      customsAgentId: true,
      trackingEvents: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { stage: true },
      },
    },
  });
  if (!booking) return { ok: false, error: "notAParty" };

  // Only reviewable once the shipment has been delivered.
  const lastStage = booking.trackingEvents[0]?.stage;
  if (lastStage !== "DELIVERED") {
    return { ok: false, error: "notDelivered" };
  }

  const rater = session.user.id;
  const parties = new Set(
    [
      booking.customerId,
      booking.forwarderId,
      booking.coworkerId,
      booking.customsAgentId,
    ].filter(Boolean) as string[]
  );
  if (!parties.has(rater)) return { ok: false, error: "notAParty" };
  if (!parties.has(ratedUserId)) return { ok: false, error: "wrongCounterparty" };
  if (rater === ratedUserId) return { ok: false, error: "wrongCounterparty" };

  // Verify the rated user's role matches the role declared in the form.
  let actualRole: typeof ratedRole | null = null;
  if (booking.forwarderId === ratedUserId) actualRole = "FORWARDER";
  else if (booking.coworkerId === ratedUserId) actualRole = "COWORKER";
  else if (booking.customsAgentId === ratedUserId) actualRole = "CUSTOMS_AGENT";
  else if (booking.customerId === ratedUserId) actualRole = "CUSTOMER";
  if (actualRole !== ratedRole) {
    return { ok: false, error: "wrongCounterparty" };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          bookingId,
          raterUserId: rater,
          ratedUserId,
          ratedRole,
          score,
          comment: comment || null,
        },
      });

      // Bump the running average on the rated user's role-specific profile.
      if (ratedRole === "FORWARDER") {
        const prof = await tx.forwarderProfile.findUnique({
          where: { userId: ratedUserId },
          select: { ratingAvg: true, ratingCount: true },
        });
        if (prof) {
          const next = appendToRunningAverage(
            prof.ratingAvg,
            prof.ratingCount,
            score
          );
          await tx.forwarderProfile.update({
            where: { userId: ratedUserId },
            data: { ratingAvg: next.avg, ratingCount: next.count },
          });
        }
      } else if (ratedRole === "COWORKER") {
        const prof = await tx.coworkerProfile.findUnique({
          where: { userId: ratedUserId },
          select: { ratingAvg: true, ratingCount: true },
        });
        if (prof) {
          const next = appendToRunningAverage(
            prof.ratingAvg,
            prof.ratingCount,
            score
          );
          await tx.coworkerProfile.update({
            where: { userId: ratedUserId },
            data: { ratingAvg: next.avg, ratingCount: next.count },
          });
        }
      } else if (ratedRole === "CUSTOMS_AGENT") {
        const prof = await tx.customsAgentProfile.findUnique({
          where: { userId: ratedUserId },
          select: { ratingAvg: true, ratingCount: true },
        });
        if (prof) {
          const next = appendToRunningAverage(
            prof.ratingAvg,
            prof.ratingCount,
            score
          );
          await tx.customsAgentProfile.update({
            where: { userId: ratedUserId },
            data: { ratingAvg: next.avg, ratingCount: next.count },
          });
        }
      }
      // CUSTOMER reviews are stored but don't update a profile counter
      // (we don't surface customer ratings publicly in v1).
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
    console.error("submitReviewAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  // Revalidate every page that surfaces ratings or the booking.
  revalidatePath(`/${locale}/customer/bookings/${bookingId}`);
  revalidatePath(`/${locale}/forwarder/bookings/${bookingId}`);
  revalidatePath(`/${locale}/coworker/bookings/${bookingId}`);
  revalidatePath(`/${locale}/customs/bookings/${bookingId}`);
  revalidatePath(`/${locale}/customer/shipments`); // ratings show on quote cards too

  return { ok: true };
}
