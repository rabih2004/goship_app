"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const updateCustomsInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO code (e.g. LB, DE)"),
  operationCities: z.string().trim().max(500).optional(),
  licenseNumber: z.string().trim().max(80).optional(),
  baseFeeUSD: z.coerce.number().min(0).max(10_000),
  docSetFeeUSD: z.coerce.number().min(0).max(10_000),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type UpdateCustomsState = {
  ok: boolean;
  error?: "auth" | "validation" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function updateCustomsProfileAction(
  _prev: UpdateCustomsState | undefined,
  formData: FormData
): Promise<UpdateCustomsState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMS_AGENT") {
    return { ok: false, error: "auth" };
  }

  const parsed = updateCustomsInput.safeParse(Object.fromEntries(formData.entries()));
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
    await db.customsAgentProfile.update({
      where: { userId: session.user.id },
      data: {
        displayName: d.displayName,
        countryCode: d.countryCode,
        operationCities: d.operationCities || null,
        licenseNumber: d.licenseNumber || null,
        baseFeeUSDCents: Math.round(d.baseFeeUSD * 100),
        docSetFeeUSDCents: Math.round(d.docSetFeeUSD * 100),
      },
    });
  } catch (e) {
    console.error("updateCustomsProfileAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${d.locale}/customs`);
  revalidatePath(`/${d.locale}/customs/profile`);
  return { ok: true };
}
