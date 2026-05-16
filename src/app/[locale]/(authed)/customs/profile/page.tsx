import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { ProfileForm } from "./ProfileForm";

export default async function CustomsProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  const user = await requireRole("CUSTOMS_AGENT", locale);

  const profile = await db.customsAgentProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      countryCode: true,
      operationCities: true,
      licenseNumber: true,
      baseFeeUSDCents: true,
      docSetFeeUSDCents: true,
      onboardingComplete: true,
    },
  });
  if (!profile) redirect(`/${locale}/customs/onboarding`);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/customs" className="text-sm text-[var(--brand)] underline">
          ← Back to dashboard
        </Link>
        {profile.onboardingComplete && (
          <Link
            href="/customs/onboarding"
            className="text-sm text-zinc-500 underline hover:text-zinc-700"
          >
            Payment setup
          </Link>
        )}
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Edit profile</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Update your identity, coverage area, and pricing. Changes apply immediately to new clearance RFQs.
      </p>

      <ProfileForm locale={locale} profile={profile} />
    </div>
  );
}
