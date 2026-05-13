"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const sendInput = z.object({
  bookingId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type SendMessageState = {
  ok: boolean;
  error?: "auth" | "validation" | "notAParty" | "unknown";
};

/**
 * Returns the set of user IDs that are parties to the booking
 * (customer + forwarder + optional coworker + optional customs agent).
 */
async function getBookingParties(
  bookingId: string
): Promise<Set<string> | null> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      customerId: true,
      forwarderId: true,
      coworkerId: true,
      customsAgentId: true,
    },
  });
  if (!b) return null;
  return new Set(
    [b.customerId, b.forwarderId, b.coworkerId, b.customsAgentId].filter(
      Boolean
    ) as string[]
  );
}

/** Lazily creates the per-booking conversation on first use. */
async function ensureConversation(bookingId: string): Promise<string> {
  const existing = await db.conversation.findUnique({
    where: { bookingId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.conversation.create({
    data: { bookingId },
    select: { id: true },
  });
  return created.id;
}

export async function sendMessageAction(
  _prev: SendMessageState | undefined,
  formData: FormData
): Promise<SendMessageState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "auth" };

  const parsed = sendInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "validation" };
  const { bookingId, body, locale } = parsed.data;

  const parties = await getBookingParties(bookingId);
  if (!parties) return { ok: false, error: "notAParty" };
  if (!parties.has(session.user.id)) return { ok: false, error: "notAParty" };

  try {
    const conversationId = await ensureConversation(bookingId);
    const now = new Date();
    await db.$transaction([
      db.message.create({
        data: { conversationId, senderId: session.user.id, body },
      }),
      db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      }),
      // Mark the sender's own read pointer to now — they've obviously seen
      // their own message.
      db.conversationRead.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId: session.user.id,
          },
        },
        create: {
          conversationId,
          userId: session.user.id,
          lastReadAt: now,
        },
        update: { lastReadAt: now },
      }),
    ]);
  } catch (e) {
    console.error("sendMessageAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  // Revalidate every variant of the booking detail page so the new message
  // shows for whichever counterpart opens it next.
  for (const root of [
    "/customer/bookings",
    "/forwarder/bookings",
    "/coworker/bookings",
    "/customs/bookings",
  ]) {
    revalidatePath(`/${locale}${root}/${bookingId}`);
    revalidatePath(`/${locale}${root}`); // unread count on list page
  }

  return { ok: true };
}

export async function markConversationReadAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const bookingId = (formData.get("bookingId") as string) || "";
  const locale = (formData.get("locale") as string) || "en";
  if (!bookingId) return;

  const parties = await getBookingParties(bookingId);
  if (!parties?.has(session.user.id)) return;

  const conversationId = await ensureConversation(bookingId);
  await db.conversationRead.upsert({
    where: {
      conversationId_userId: { conversationId, userId: session.user.id },
    },
    create: {
      conversationId,
      userId: session.user.id,
      lastReadAt: new Date(),
    },
    update: { lastReadAt: new Date() },
  });

  // Bust the header unread badge.
  revalidatePath(`/${locale}/customer`);
  revalidatePath(`/${locale}/forwarder`);
  revalidatePath(`/${locale}/coworker`);
  revalidatePath(`/${locale}/customs`);
}

/**
 * Returns the total unread message count across all bookings the user is a
 * party to. Used by the header badge. One DB hit.
 */
export async function getTotalUnread(userId: string): Promise<number> {
  // Find all bookings the user is a party to.
  const bookings = await db.booking.findMany({
    where: {
      OR: [
        { customerId: userId },
        { forwarderId: userId },
        { coworkerId: userId },
        { customsAgentId: userId },
      ],
    },
    select: {
      id: true,
      conversation: {
        select: {
          id: true,
          messages: {
            where: { senderId: { not: userId } },
            select: { createdAt: true },
          },
          reads: {
            where: { userId },
            select: { lastReadAt: true },
          },
        },
      },
    },
  });

  let count = 0;
  for (const b of bookings) {
    if (!b.conversation) continue;
    const lastRead = b.conversation.reads[0]?.lastReadAt ?? new Date(0);
    for (const m of b.conversation.messages) {
      if (m.createdAt > lastRead) count += 1;
    }
  }
  return count;
}
