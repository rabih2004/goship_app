"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const VEHICLE_TYPES = ["Van", "Truck-20ft", "Truck-40ft", "Flatbed"] as const;

const updateProfileInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO code (e.g. LB, DE)"),
  cityArea: z.string().trim().min(1).max(120),
  serviceCenterLat: z.coerce.number().min(-90).max(90),
  serviceCenterLng: z.coerce.number().min(-180).max(180),
  serviceRadiusKm: z.coerce.number().int().min(1).max(500),
  baseFeeUSD: z.coerce.number().min(0).max(10_000),
  perKmRateUSD: z.coerce.number().min(0).max(1_000),
  vehicleType: z.enum(VEHICLE_TYPES),
  vehicleCapacityKg: z.coerce.number().int().min(1).max(100_000),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type UpdateProfileState = {
  ok: boolean;
  error?: "auth" | "validation" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function updateCoworkerProfileAction(
  _prev: UpdateProfileState | undefined,
  formData: FormData
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "COWORKER") {
    return { ok: false, error: "auth" };
  }

  const parsed = updateProfileInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const d = parsed.data;

  try {
    await db.coworkerProfile.update({
      where: { userId: session.user.id },
      data: {
        displayName: d.displayName,
        countryCode: d.countryCode,
        cityArea: d.cityArea,
        serviceCenterLat: d.serviceCenterLat,
        serviceCenterLng: d.serviceCenterLng,
        serviceRadiusKm: d.serviceRadiusKm,
        baseFeeUSDCents: Math.round(d.baseFeeUSD * 100),
        perKmRateUSDCents: Math.round(d.perKmRateUSD * 100),
        vehicleType: d.vehicleType,
        vehicleCapacityKg: d.vehicleCapacityKg,
      },
    });
  } catch (e) {
    console.error("updateCoworkerProfileAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${d.locale}/coworker`);
  revalidatePath(`/${d.locale}/coworker/profile`);
  return { ok: true };
}
