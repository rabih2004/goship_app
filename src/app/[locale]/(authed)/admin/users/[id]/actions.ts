"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

function requireAdmin() {
  return auth().then((s) => {
    if (!s?.user || s.user.role !== "ADMIN") throw new Error("unauthorized");
    return s;
  });
}

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_root";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type AdminEditState = {
  ok: boolean;
  error?: "auth" | "validation" | "unknown";
  fieldErrors?: Record<string, string>;
};

// ── Account ────────────────────────────────────────────────────────────────

const accountInput = z.object({
  userId: z.string().min(1),
  name: z.string().trim().max(120).optional(),
  suspended: z.enum(["true", "false"]).transform((v) => v === "true"),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function adminUpdateAccountAction(
  _prev: AdminEditState | undefined,
  formData: FormData
): Promise<AdminEditState> {
  try { await requireAdmin(); } catch { return { ok: false, error: "auth" }; }

  const parsed = accountInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  const { userId, name, suspended, locale } = parsed.data;
  try {
    await db.user.update({ where: { id: userId }, data: { name: name || null, suspended } });
  } catch { return { ok: false, error: "unknown" }; }

  revalidatePath(`/${locale}/admin/users/${userId}`);
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}

// ── Forwarder profile ───────────────────────────────────────────────────────

const forwarderInput = z.object({
  userId: z.string().min(1),
  companyName: z.string().trim().min(1).max(120),
  registrationNumber: z.string().trim().max(80).optional(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "2-letter ISO code"),
  onboardingComplete: z.enum(["true", "false"]).transform((v) => v === "true"),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function adminUpdateForwarderAction(
  _prev: AdminEditState | undefined,
  formData: FormData
): Promise<AdminEditState> {
  try { await requireAdmin(); } catch { return { ok: false, error: "auth" }; }

  const parsed = forwarderInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  const { userId, locale, ...data } = parsed.data;
  try {
    await db.forwarderProfile.update({
      where: { userId },
      data: { ...data, registrationNumber: data.registrationNumber || null },
    });
  } catch { return { ok: false, error: "unknown" }; }

  revalidatePath(`/${locale}/admin/users/${userId}`);
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}

// ── Coworker profile ────────────────────────────────────────────────────────

const VEHICLE_TYPES = ["Van", "Truck-20ft", "Truck-40ft", "Flatbed"] as const;

const coworkerInput = z.object({
  userId: z.string().min(1),
  displayName: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "2-letter ISO code"),
  cityArea: z.string().trim().min(1).max(120),
  serviceRadiusKm: z.coerce.number().int().min(1).max(500),
  baseFeeUSD: z.coerce.number().min(0).max(10_000),
  perKmRateUSD: z.coerce.number().min(0).max(1_000),
  vehicleType: z.enum(VEHICLE_TYPES),
  vehicleCapacityKg: z.coerce.number().int().min(1).max(100_000),
  onboardingComplete: z.enum(["true", "false"]).transform((v) => v === "true"),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function adminUpdateCoworkerAction(
  _prev: AdminEditState | undefined,
  formData: FormData
): Promise<AdminEditState> {
  try { await requireAdmin(); } catch { return { ok: false, error: "auth" }; }

  const parsed = coworkerInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  const { userId, locale, baseFeeUSD, perKmRateUSD, ...rest } = parsed.data;
  try {
    await db.coworkerProfile.update({
      where: { userId },
      data: {
        ...rest,
        baseFeeUSDCents: Math.round(baseFeeUSD * 100),
        perKmRateUSDCents: Math.round(perKmRateUSD * 100),
      },
    });
  } catch { return { ok: false, error: "unknown" }; }

  revalidatePath(`/${locale}/admin/users/${userId}`);
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}

// ── Customs agent profile ───────────────────────────────────────────────────

const customsInput = z.object({
  userId: z.string().min(1),
  displayName: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "2-letter ISO code"),
  operationCities: z.string().trim().max(500).optional(),
  licenseNumber: z.string().trim().max(80).optional(),
  baseFeeUSD: z.coerce.number().min(0).max(10_000),
  docSetFeeUSD: z.coerce.number().min(0).max(10_000),
  onboardingComplete: z.enum(["true", "false"]).transform((v) => v === "true"),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function adminUpdateCustomsAction(
  _prev: AdminEditState | undefined,
  formData: FormData
): Promise<AdminEditState> {
  try { await requireAdmin(); } catch { return { ok: false, error: "auth" }; }

  const parsed = customsInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };

  const { userId, locale, baseFeeUSD, docSetFeeUSD, ...rest } = parsed.data;
  try {
    await db.customsAgentProfile.update({
      where: { userId },
      data: {
        ...rest,
        operationCities: rest.operationCities || null,
        licenseNumber: rest.licenseNumber || null,
        baseFeeUSDCents: Math.round(baseFeeUSD * 100),
        docSetFeeUSDCents: Math.round(docSetFeeUSD * 100),
      },
    });
  } catch { return { ok: false, error: "unknown" }; }

  revalidatePath(`/${locale}/admin/users/${userId}`);
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true };
}
