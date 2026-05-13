"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isMock } from "@/lib/payments";

export async function startCustomsOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMS_AGENT") return;
  const locale = (formData.get("locale") as string) || "en";

  const profile = await db.customsAgentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      stripeAccountId: true,
      displayName: true,
      countryCode: true,
    },
  });
  if (!profile) return;

  if (isMock()) {
    await db.customsAgentProfile.update({
      where: { userId: session.user.id },
      data: { onboardingComplete: true },
    });
    revalidatePath(`/${locale}/customs/onboarding`);
    revalidatePath(`/${locale}/customs`);
    redirect(`/${locale}/customs/onboarding?return=1`);
  }

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
    await db.customsAgentProfile.update({
      where: { userId: session.user.id },
      data: { stripeAccountId: accountId },
    });
  }

  const baseUrl = process.env.AUTH_URL ?? `http://localhost:3000`;
  const link = await createAccountOnboardingLink({
    accountId,
    refreshUrl: `${baseUrl}/${locale}/customs/onboarding`,
    returnUrl: `${baseUrl}/${locale}/customs/onboarding?return=1`,
  });

  redirect(link.url);
}

export async function refreshCustomsAccountStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMS_AGENT") return;
  const locale = (formData.get("locale") as string) || "en";

  if (isMock()) {
    revalidatePath(`/${locale}/customs/onboarding`);
    return;
  }

  const profile = await db.customsAgentProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeAccountId: true },
  });
  if (!profile?.stripeAccountId) return;

  const { retrieveAccount, isAccountReady } = await import("@/lib/stripe");
  const account = await retrieveAccount(profile.stripeAccountId);
  await db.customsAgentProfile.update({
    where: { userId: session.user.id },
    data: { onboardingComplete: isAccountReady(account) },
  });

  revalidatePath(`/${locale}/customs/onboarding`);
  revalidatePath(`/${locale}/customs`);
}

export async function mockResetCustomsOnboardingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMS_AGENT") return;
  if (!isMock()) return;
  const locale = (formData.get("locale") as string) || "en";

  await db.customsAgentProfile.update({
    where: { userId: session.user.id },
    data: { onboardingComplete: false, stripeAccountId: null },
  });
  revalidatePath(`/${locale}/customs/onboarding`);
  revalidatePath(`/${locale}/customs`);
}
