/**
 * In-app notifications — pure helpers + server actions.
 *
 * Design:
 * - Fan-out at write time. When something happens (new RFQ, stage advanced,
 *   review received, etc.), we insert N rows — one per recipient — so the
 *   inbox query is a single indexed lookup.
 * - `type` is the verb template (rendered via i18n); `bodyText` carries
 *   proper nouns ("Booking GS-2026-0042" / "Beirut → Hamburg") that we'd
 *   rather not interpolate at render time.
 * - `linkPath` is locale-less (e.g. "/customer/bookings/abc123"). The bell
 *   prepends the current locale.
 * - Chat unread counts live in their own ConversationRead table — we don't
 *   double-track here. NEW_MESSAGE is intentionally NOT a NotificationType.
 *
 * No fan-out batching beyond a single createMany call. If you're notifying
 * 500 forwarders that an RFQ landed, that's fine — the indexed lookup is
 * cheap. Scale concerns belong in Sprint 24+ (queue + worker).
 */
import type { NotificationType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  bookingId?: string | null;
  shipmentId?: string | null;
  bodyText?: string | null;
  linkPath?: string | null;
};

/**
 * Fan-out helper. Tolerates duplicate insert failures silently — we never
 * want a notification error to break the user-facing action that triggered it.
 */
export async function createNotifications(
  inputs: NotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.notification.createMany({
      data: inputs.map((n) => ({
        userId: n.userId,
        type: n.type,
        bookingId: n.bookingId ?? null,
        shipmentId: n.shipmentId ?? null,
        bodyText: n.bodyText ?? null,
        linkPath: n.linkPath ?? null,
      })),
      skipDuplicates: true,
    });
  } catch (e) {
    console.error("createNotifications failed (non-fatal):", e);
  }
}

export async function createNotification(input: NotificationInput): Promise<void> {
  return createNotifications([input]);
}

/**
 * Unread count for the header bell. Single indexed read against
 * `@@index([userId, readAt])` — readAt IS NULL is the unread predicate.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, readAt: null },
  });
}

/**
 * Recent notifications list. Cap at 50 to keep page render bounded.
 */
export async function listNotificationsForUser(
  userId: string,
  limit = 50
): Promise<
  Prisma.NotificationGetPayload<{
    select: {
      id: true;
      type: true;
      bodyText: true;
      linkPath: true;
      readAt: true;
      createdAt: true;
      bookingId: true;
      shipmentId: true;
    };
  }>[]
> {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      bodyText: true,
      linkPath: true,
      readAt: true,
      createdAt: true,
      bookingId: true,
      shipmentId: true,
    },
  });
}
