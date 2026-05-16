"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isSupportedCurrency } from "@/lib/fx";

export async function updatePreferredCurrencyAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const currency = (formData.get("currency") as string) || "USD";
  const locale = (formData.get("locale") as string) || "en";
  if (!isSupportedCurrency(currency)) return;

  await db.user.update({
    where: { id: session.user.id },
    data: { preferredCurrency: currency },
  });

  // Bust every page that renders money so the new currency takes effect
  // immediately. Cheap — these are SSR-only revalidations, no client JS.
  for (const root of [
    "/customer",
    "/forwarder",
    "/coworker",
    "/customs",
    "/admin",
    "/settings",
  ]) {
    revalidatePath(`/${locale}${root}`);
  }
}
