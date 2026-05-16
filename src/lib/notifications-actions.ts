"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Mark a single notification read. Caller-owned only — silent no-op if the
 * id belongs to someone else (don't leak existence).
 */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const id = (formData.get("id") as string) || "";
  const locale = (formData.get("locale") as string) || "en";
  if (!id) return;

  await db.notification.updateMany({
    where: { id, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath(`/${locale}/notifications`);
  bustHeaderBadge(locale);
}

/**
 * Mark all of the current user's notifications read.
 */
export async function markAllNotificationsReadAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const locale = (formData.get("locale") as string) || "en";

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath(`/${locale}/notifications`);
  bustHeaderBadge(locale);
}

function bustHeaderBadge(locale: string): void {
  // Bell lives in the (authed) layout — revalidate the per-role dashboards
  // that frame anchor.
  for (const root of [
    "/customer",
    "/forwarder",
    "/coworker",
    "/customs",
    "/admin",
  ]) {
    revalidatePath(`/${locale}${root}`);
  }
}
