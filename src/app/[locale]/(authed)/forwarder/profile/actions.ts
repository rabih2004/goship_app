"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const updateForwarderInput = z.object({
  companyName: z.string().trim().min(1).max(120),
  registrationNumber: z.string().trim().max(80).optional(),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO code (e.g. LB, DE)"),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type UpdateForwarderState = {
  ok: boolean;
  error?: "auth" | "validation" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function updateForwarderProfileAction(
  _prev: UpdateForwarderState | undefined,
  formData: FormData
): Promise<UpdateForwarderState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") {
    return { ok: false, error: "auth" };
  }

  const parsed = updateForwarderInput.safeParse(Object.fromEntries(formData.entries()));
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
    await db.forwarderProfile.update({
      where: { userId: session.user.id },
      data: {
        companyName: d.companyName,
        registrationNumber: d.registrationNumber || null,
        countryCode: d.countryCode,
      },
    });
  } catch (e) {
    console.error("updateForwarderProfileAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/${d.locale}/forwarder`);
  revalidatePath(`/${d.locale}/forwarder/profile`);
  return { ok: true };
}
