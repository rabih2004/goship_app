"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isMock } from "@/lib/payments";

export async function startCoworkerOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COWORKER") return;
  const locale = (formData.get("locale") as string) || "en";

  const profile = await db.coworkerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      stripeAccountId: true,
      displayName: true,
      countryCode: true,
    },
  });
  if (!profile) return;

  // --- Mock mode: instant onboarding ---
  if (isMock()) {
    await db.coworkerProfile.update({
      where: { userId: session.user.id },
      data: { onboardingComplete: true },
    });
    revalidatePath(`/${locale}/coworker/onboarding`);
    revalidatePath(`/${locale}/coworker`);
    redirect(`/${locale}/coworker/onboarding?return=1`);
  }

  // --- Stripe mode: real Connect Express onboarding ---
  const { createConnectAccount, createAccountOnboardingLink } = await import(
    "@/lib/stripe"
  );

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await createConnectAccount({
      email: session.user.email ?? "",
      countryCode: profile.countryCode,
      companyName: profile.displayName,
    });
    accountId = account.id;
    await db.coworkerProfile.update({
      where: { userId: session.user.id },
      data: { stripeAccountId: accountId },
    });
  }

  const baseUrl = process.env.AUTH_URL ?? `http://localhost:3000`;
  const link = await createAccountOnboardingLink({
    accountId,
    refreshUrl: `${baseUrl}/${locale}/coworker/onboarding`,
    returnUrl: `${baseUrl}/${locale}/coworker/onboarding?return=1`,
  });

  redirect(link.url);
}

export async function refreshCoworkerAccountStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COWORKER") return;
  const locale = (formData.get("locale") as string) || "en";

  if (isMock()) {
    revalidatePath(`/${locale}/coworker/onboarding`);
    return;
  }

  const profile = await db.coworkerProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeAccountId: true },
  });
  if (!profile?.stripeAccountId) return;

  const { retrieveAccount, isAccountReady } = await import("@/lib/stripe");
  const account = await retrieveAccount(profile.stripeAccountId);
  await db.coworkerProfile.update({
    where: { userId: session.user.id },
    data: { onboardingComplete: isAccountReady(account) },
  });

  revalidatePath(`/${locale}/coworker/onboarding`);
  revalidatePath(`/${locale}/coworker`);
}

export async function mockResetCoworkerOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COWORKER") return;
  if (!isMock()) return;
  const locale = (formData.get("locale") as string) || "en";

  await db.coworkerProfile.update({
    where: { userId: session.user.id },
    data: { onboardingComplete: false, stripeAccountId: null },
  });
  revalidatePath(`/${locale}/coworker/onboarding`);
  revalidatePath(`/${locale}/coworker`);
}
