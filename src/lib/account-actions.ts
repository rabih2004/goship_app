"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isSupportedCurrency } from "@/lib/fx";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(30).optional(),
  preferredCurrency: z.string().trim(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
  locale: z.enum(["en", "ar"]).default("en"),
});

export type UpdateAccountState = {
  ok: boolean;
  error?: "auth" | "validation" | "wrongPassword" | "unknown";
  fieldErrors?: Record<string, string>;
};

export async function updateAccountAction(
  _prev: UpdateAccountState | undefined,
  formData: FormData
): Promise<UpdateAccountState> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "auth" };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_root";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  const d = parsed.data;
  const fieldErrors: Record<string, string> = {};

  if (!isSupportedCurrency(d.preferredCurrency)) {
    fieldErrors.preferredCurrency = "Unsupported currency";
  }

  const changingPassword = !!d.newPassword?.trim();
  if (changingPassword) {
    if (!d.currentPassword?.trim()) {
      fieldErrors.currentPassword = "Enter your current password to set a new one";
    }
    if ((d.newPassword?.trim().length ?? 0) < 8) {
      fieldErrors.newPassword = "Password must be at least 8 characters";
    }
    if (d.newPassword !== d.confirmPassword) {
      fieldErrors.confirmPassword = "Passwords do not match";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "validation", fieldErrors };
  }

  if (changingPassword) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    const match =
      dbUser?.passwordHash &&
      (await bcrypt.compare(d.currentPassword!.trim(), dbUser.passwordHash));
    if (!match) return { ok: false, error: "wrongPassword" };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: d.name,
        phone: d.phone?.trim() || null,
        preferredCurrency: d.preferredCurrency,
        ...(changingPassword && {
          passwordHash: await bcrypt.hash(d.newPassword!.trim(), 12),
        }),
      },
    });
  } catch (e) {
    console.error("updateAccountAction failed:", e);
    return { ok: false, error: "unknown" };
  }

  for (const root of ["/customer", "/forwarder", "/coworker", "/customs", "/admin"]) {
    revalidatePath(`/${d.locale}${root}`);
  }
  return { ok: true };
}
