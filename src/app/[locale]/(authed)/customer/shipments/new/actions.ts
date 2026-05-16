"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";

const baseInput = z.object({
  originPortUnlocode: z.string().regex(/^[A-Z]{5,10}$/),
  destinationPortUnlocode: z.string().regex(/^[A-Z]{5,10}$/),
  containerType: z.enum(["TWENTY_FT", "FORTY_FT", "FORTY_HC", "LCL"]),
  cargoDescription: z.string().trim().min(3).max(2000),
  weightKg: z.coerce.number().int().min(1).max(40000),
  readyDate: z.coerce.date(),
  needsCustomsClearance: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .transform((v) => v === "on" || v === "true")
    .optional(),
  wantsInsurance: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .transform((v) => v === "on" || v === "true")
    .optional(),
  cargoValueUSD: z.coerce.number().min(0).max(10_000_000).optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

const fobInput = baseInput.extend({ incoterm: z.literal("FOB") });

const exwInput = baseInput.extend({
  incoterm: z.literal("EXW"),
  factoryAddressLine: z.string().trim().min(1).max(300),
  // City may be empty when the user picks a remote spot the geocoder doesn't
  // resolve to a named city. Lat/lng are the source of truth for matching.
  factoryCity: z.string().trim().max(120).default(""),
  factoryCity_lat: z.coerce.number().min(-90).max(90),
  factoryCity_lng: z.coerce.number().min(-180).max(180),
  pickupContactName: z.string().trim().min(1).max(120),
  pickupContactPhone: z.string().trim().min(1).max(40),
  preferredCoworkerId: z.string().trim().max(30).optional(),
});

const createInput = z
  .discriminatedUnion("incoterm", [fobInput, exwInput])
  .refine((d) => d.originPortUnlocode !== d.destinationPortUnlocode, {
    message: "Origin and destination must differ",
    path: ["destinationPortUnlocode"],
  });

export type NewShipmentState = {
  ok: boolean;
  error?: "auth" | "validation" | "unknownPort" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function createShipmentAction(
  _prev: NewShipmentState | undefined,
  formData: FormData
): Promise<NewShipmentState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return { ok: false, error: "auth" };
  }

  const parsed = createInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const data = parsed.data;
  const { locale } = data;

  const portsExist = await db.port.count({
    where: {
      unlocode: { in: [data.originPortUnlocode, data.destinationPortUnlocode] },
    },
  });
  if (portsExist !== 2) return { ok: false, error: "unknownPort" };

  const shipment = await db.shipment.create({
    data: {
      customerId: session.user.id,
      originPortUnlocode: data.originPortUnlocode,
      destinationPortUnlocode: data.destinationPortUnlocode,
      containerType: data.containerType,
      cargoDescription: data.cargoDescription,
      weightKg: data.weightKg,
      readyDate: data.readyDate,
      incoterm: data.incoterm,
      status: "RFQ_OPEN",
      needsCustomsClearance: data.needsCustomsClearance ?? false,
      wantsInsurance: data.wantsInsurance ?? false,
      cargoValueUSDCents:
        data.wantsInsurance && data.cargoValueUSD
          ? Math.round(data.cargoValueUSD * 100)
          : null,
      ...(data.incoterm === "EXW"
        ? {
            factoryAddressLine: data.factoryAddressLine,
            factoryCity: data.factoryCity,
            factoryLat: data.factoryCity_lat,
            factoryLng: data.factoryCity_lng,
            pickupContactName: data.pickupContactName,
            pickupContactPhone: data.pickupContactPhone,
            preferredCoworkerId: data.preferredCoworkerId || null,
          }
        : {}),
    },
    select: { id: true },
  });

  // Notify the directly-selected coworker (EXW direct request).
  if (data.incoterm === "EXW" && data.preferredCoworkerId) {
    await createNotifications([{
      userId: data.preferredCoworkerId,
      type: "PICKUP_REQUEST" as const,
      shipmentId: shipment.id,
      bodyText: `${data.factoryCity || data.factoryAddressLine} → ${data.originPortUnlocode}`,
      linkPath: `/coworker/rfq/${shipment.id}`,
    }]);
  }

  // Notify every forwarder with an active lane matching origin → destination
  // that a fresh RFQ landed in their inbox.
  const matchingLanes = await db.lane.findMany({
    where: {
      active: true,
      originPortUnlocode: data.originPortUnlocode,
      destinationPortUnlocode: data.destinationPortUnlocode,
    },
    select: { forwarderId: true },
  });
  if (matchingLanes.length > 0) {
    const route = `${data.originPortUnlocode} → ${data.destinationPortUnlocode}`;
    await createNotifications(
      matchingLanes.map((l) => ({
        userId: l.forwarderId,
        type: "NEW_RFQ_ON_LANE" as const,
        shipmentId: shipment.id,
        bodyText: route,
        linkPath: `/forwarder/rfq/${shipment.id}`,
      }))
    );
  }

  redirect(`/${locale}/customer/shipments/${shipment.id}`);
}
