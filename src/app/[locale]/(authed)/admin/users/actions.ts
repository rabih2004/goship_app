"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const targetInput = z.object({
  userId: z.string().min(1),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function setSuspendedAction(suspended: boolean, formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return;
  const parsed = targetInput.safeParse({
    userId: formData.get("userId"),
    locale: formData.get("locale") || "en",
  });
  if (!parsed.success) return;
  const { userId, locale } = parsed.data;

  // Admins can't suspend themselves — that would lock them out.
  if (userId === session.user.id) return;

  await db.user.update({
    where: { id: userId },
    data: { suspended },
  });

  revalidatePath(`/${locale}/admin/users`);
}

export async function suspendUserAction(formData: FormData) {
  await setSuspendedAction(true, formData);
}

export async function unsuspendUserAction(formData: FormData) {
  await setSuspendedAction(false, formData);
}
