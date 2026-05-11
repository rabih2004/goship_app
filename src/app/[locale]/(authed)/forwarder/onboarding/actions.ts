"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isMock } from "@/lib/payments";

export async function startOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") return;
  const locale = (formData.get("locale") as string) || "en";

  const profile = await db.forwarderProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      stripeAccountId: true,
      companyName: true,
      countryCode: true,
    },
  });
  if (!profile) return;

  // --- Mock mode: instant onboarding, no external call ---
  if (isMock()) {
    await db.forwarderProfile.update({
      where: { userId: session.user.id },
      data: { onboardingComplete: true },
    });
    revalidatePath(`/${locale}/forwarder/onboarding`);
    revalidatePath(`/${locale}/forwarder`);
    redirect(`/${locale}/forwarder/onboarding?return=1`);
  }

  // --- Stripe mode: real Connect Express onboarding ---
  // Lazy-import so we don't pull in the Stripe SDK in mock mode.
  const { createConnectAccount, createAccountOnboardingLink } = await import(
    "@/lib/stripe"
  );

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await createConnectAccount({
      email: session.user.email ?? "",
      countryCode: profile.countryCode,
      companyName: profile.companyName,
    });
    accountId = account.id;
    await db.forwarderProfile.update({
      where: { userId: session.user.id },
      data: { stripeAccountId: accountId },
    });
  }

  const baseUrl = process.env.AUTH_URL ?? `http://localhost:3000`;
  const link = await createAccountOnboardingLink({
    accountId,
    refreshUrl: `${baseUrl}/${locale}/forwarder/onboarding`,
    returnUrl: `${baseUrl}/${locale}/forwarder/onboarding?return=1`,
  });

  redirect(link.url);
}

export async function refreshAccountStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") return;
  const locale = (formData.get("locale") as string) || "en";

  if (isMock()) {
    revalidatePath(`/${locale}/forwarder/onboarding`);
    return;
  }

  const profile = await db.forwarderProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeAccountId: true },
  });
  if (!profile?.stripeAccountId) return;

  const { retrieveAccount, isAccountReady } = await import("@/lib/stripe");
  const account = await retrieveAccount(profile.stripeAccountId);
  await db.forwarderProfile.update({
    where: { userId: session.user.id },
    data: { onboardingComplete: isAccountReady(account) },
  });

  revalidatePath(`/${locale}/forwarder/onboarding`);
  revalidatePath(`/${locale}/forwarder`);
}

/**
 * Mock-only escape hatch: lets a forwarder reset their onboardingComplete flag
 * back to false so they can test the gated UX. No-op when PAYMENT_PROVIDER=stripe.
 */
export async function mockResetOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "FORWARDER") return;
  if (!isMock()) return;
  const locale = (formData.get("locale") as string) || "en";

  await db.forwarderProfile.update({
    where: { userId: session.user.id },
    data: { onboardingComplete: false, stripeAccountId: null },
  });
  revalidatePath(`/${locale}/forwarder/onboarding`);
  revalidatePath(`/${locale}/forwarder`);
}
