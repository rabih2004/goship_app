import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { ProfileForm } from "./ProfileForm";

export default async function CoworkerProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  const user = await requireRole("COWORKER", locale);

  const profile = await db.coworkerProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      countryCode: true,
      cityArea: true,
      serviceCenterLat: true,
      serviceCenterLng: true,
      serviceRadiusKm: true,
      baseFeeUSDCents: true,
      perKmRateUSDCents: true,
      vehicleType: true,
      vehicleCapacityKg: true,
      onboardingComplete: true,
    },
  });
  if (!profile) redirect(`/${locale}/coworker/onboarding`);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/coworker" className="text-sm text-[var(--brand)] underline">
          ← Back to dashboard
        </Link>
        {profile.onboardingComplete && (
          <Link
            href="/coworker/onboarding"
            className="text-sm text-zinc-500 underline hover:text-zinc-700"
          >
            Payment setup
          </Link>
        )}
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Edit profile</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Update your service area, pricing, and vehicle details. Changes apply immediately to new RFQ matches.
      </p>

      <ProfileForm locale={locale} profile={profile} />
    </div>
  );
}
