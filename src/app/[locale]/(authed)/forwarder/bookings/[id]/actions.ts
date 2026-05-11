"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { sendEmail, tplStageChanged, tplDocumentUploaded } from "@/lib/email";

const STAGES = ["BOOKED", "LOADED", "DEPARTED", "ARRIVED", "CLEARED", "DELIVERED"] as const;
type Stage = (typeof STAGES)[number];

const advanceInput = z.object({
  bookingId: z.string().min(1),
  notes: z.string().max(500).optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type AdvanceState = {
  ok: boolean;
  error?: "auth" | "validation" | "notFound" | "alreadyDelivered" | "unknown";
};

export async function advanceStageAction(
  _prev: AdvanceState | undefined,
  formData: FormData
): Promise<AdvanceState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") {
    return { ok: false, error: "auth" };
  }

  const parsed = advanceInput.safeParse({
    bookingId: formData.get("bookingId"),
    notes: formData.get("notes") || undefined,
    locale: formData.get("locale") || "en",
  });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { bookingId, notes, locale } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      forwarderId: true,
      bookingNumber: true,
      shipmentId: true,
      customer: { select: { email: true } },
      trackingEvents: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { stage: true },
      },
    },
  });
  if (!booking || booking.forwarderId !== session.user.id) {
    return { ok: false, error: "notFound" };
  }

  const currentStage =
    (booking.trackingEvents[0]?.stage as Stage | undefined) ?? "BOOKED";
  if (currentStage === "DELIVERED") {
    return { ok: false, error: "alreadyDelivered" };
  }

  const idx = STAGES.indexOf(currentStage);
  const nextStage = STAGES[idx + 1];
  if (!nextStage) return { ok: false, error: "alreadyDelivered" };

  try {
    await db.$transaction(async (tx) => {
      await tx.trackingEvent.create({
        data: {
          bookingId: booking.id,
          stage: nextStage,
          createdById: session.user.id,
          notes: notes ?? null,
        },
      });

      // Mirror the booking's progress onto the Shipment.status enum.
      const shipmentStatus =
        nextStage === "DELIVERED"
          ? "DELIVERED"
          : nextStage === "BOOKED"
            ? "BOOKED"
            : "IN_TRANSIT";
      await tx.shipment.update({
        where: { id: booking.shipmentId },
        data: { status: shipmentStatus },
      });
    });
  } catch (e) {
    console.error("advanceStageAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  // Notify customer (out-of-band; failures shouldn't fail the action)
  void sendEmail({
    to: booking.customer.email,
    subject: `Shipment ${booking.bookingNumber} → ${nextStage}`,
    text: tplStageChanged({
      bookingNumber: booking.bookingNumber,
      newStage: nextStage,
      notes,
      trackingUrl: `${process.env.AUTH_URL ?? "http://localhost:3000"}/${locale}/customer/bookings/${booking.id}`,
    }),
  }).catch((err) => console.error("stage email failed:", err));

  revalidatePath(`/${locale}/forwarder/bookings/${booking.id}`);
  revalidatePath(`/${locale}/forwarder/bookings`);
  revalidatePath(`/${locale}/customer/bookings/${booking.id}`);
  revalidatePath(`/${locale}/customer/bookings`);

  return { ok: true };
}

// --------------------------------------------------------------------------
// Document upload
// --------------------------------------------------------------------------

const uploadInput = z.object({
  bookingId: z.string().min(1),
  type: z.enum(["BL", "INVOICE", "PACKING_LIST", "OTHER"]),
  locale: z.enum(["en", "ar"]).default("en"),
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export type UploadState = {
  ok: boolean;
  error?:
    | "auth"
    | "validation"
    | "notFound"
    | "tooLarge"
    | "badType"
    | "missing"
    | "unknown";
};

export async function uploadDocumentAction(
  _prev: UploadState | undefined,
  formData: FormData
): Promise<UploadState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") {
    return { ok: false, error: "auth" };
  }

  const parsed = uploadInput.safeParse({
    bookingId: formData.get("bookingId"),
    type: formData.get("type"),
    locale: formData.get("locale") || "en",
  });
  if (!parsed.success) return { ok: false, error: "validation" };
  const { bookingId, type, locale } = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "missing" };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "tooLarge" };
  if (!ALLOWED_MIME.has(file.type)) return { ok: false, error: "badType" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      forwarderId: true,
      bookingNumber: true,
      customer: { select: { email: true } },
    },
  });
  if (!booking || booking.forwarderId !== session.user.id) {
    return { ok: false, error: "notFound" };
  }

  const ext = extFromMime(file.type);
  const storageKey = `bookings/${booking.id}/${randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const adapter = await storage();
    await adapter.put({ key: storageKey, body: buf, contentType: file.type });

    await db.document.create({
      data: {
        bookingId: booking.id,
        type,
        storageKey,
        filename: file.name.slice(0, 200),
        contentType: file.type,
        sizeBytes: file.size,
        uploadedById: session.user.id,
      },
    });
  } catch (e) {
    console.error("uploadDocumentAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  void sendEmail({
    to: booking.customer.email,
    subject: `New ${type} for booking ${booking.bookingNumber}`,
    text: tplDocumentUploaded({
      bookingNumber: booking.bookingNumber,
      documentType: type,
      trackingUrl: `${process.env.AUTH_URL ?? "http://localhost:3000"}/${locale}/customer/bookings/${booking.id}`,
    }),
  }).catch((err) => console.error("doc email failed:", err));

  revalidatePath(`/${locale}/forwarder/bookings/${booking.id}`);
  revalidatePath(`/${locale}/customer/bookings/${booking.id}`);

  return { ok: true };
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return ".pdf";
    case "image/png":
      return ".png";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    default:
      return "";
  }
}
