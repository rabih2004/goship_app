"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const baseInput = z.object({
  originPortUnlocode: z.string().regex(/^[A-Z]{5,10}$/),
  destinationPortUnlocode: z.string().regex(/^[A-Z]{5,10}$/),
  containerType: z.enum(["TWENTY_FT", "FORTY_FT", "FORTY_HC", "LCL"]),
  cargoDescription: z.string().trim().min(3).max(2000),
  weightKg: z.coerce.number().int().min(1).max(40000),
  readyDate: z.coerce.date(),
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
      ...(data.incoterm === "EXW"
        ? {
            factoryAddressLine: data.factoryAddressLine,
            factoryCity: data.factoryCity,
            factoryLat: data.factoryCity_lat,
            factoryLng: data.factoryCity_lng,
            pickupContactName: data.pickupContactName,
            pickupContactPhone: data.pickupContactPhone,
          }
        : {}),
    },
    select: { id: true },
  });

  redirect(`/${locale}/customer/shipments/${shipment.id}`);
}
