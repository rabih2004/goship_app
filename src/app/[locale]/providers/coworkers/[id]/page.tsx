import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { RatingStars } from "@/components/RatingStars";

export default async function CoworkerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Providers" });

  const profile = await db.coworkerProfile.findUnique({
    where: { userId: id },
    select: {
      userId: true,
      displayName: true,
      countryCode: true,
      cityArea: true,
      serviceRadiusKm: true,
      perKmRateUSDCents: true,
      baseFeeUSDCents: true,
      vehicleType: true,
      vehicleCapacityKg: true,
      onboardingComplete: true,
      ratingAvg: true,
      ratingCount: true,
      user: { select: { suspended: true } },
    },
  });

  if (!profile || !profile.onboardingComplete || profile.user.suspended) {
    notFound();
  }

  const completedPickups = await db.booking.count({
    where: {
      coworkerId: id,
      trackingEvents: { some: { stage: "DELIVERED" } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/providers/coworkers"
        className="text-sm text-[var(--brand)] underline"
      >
        <span className="dir-back" /> {t("backToCoworkers")}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-zinc-900">
        {profile.displayName}
      </h1>
      <div className="mt-1 text-sm uppercase tracking-wide text-zinc-500">
        {profile.cityArea} · {profile.countryCode}
      </div>
      <div className="mt-3">
        <RatingStars avg={profile.ratingAvg} count={profile.ratingCount} />
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label={t("statCompletedPickups")}
          value={String(completedPickups)}
        />
        <Stat label={t("statRadius")} value={`${profile.serviceRadiusKm} km`} />
        <Stat label={t("statRating")} value={profile.ratingAvg.toFixed(1)} />
      </dl>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-medium text-zinc-900">
          {t("vehicleTitle")}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">{t("statVehicle")}</dt>
            <dd className="text-zinc-900">{profile.vehicleType}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t("statCapacity")}</dt>
            <dd className="text-zinc-900">{profile.vehicleCapacityKg} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t("statPerKm")}</dt>
            <dd className="text-zinc-900">
              ${(profile.perKmRateUSDCents / 100).toFixed(2)}/km
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm text-zinc-700">{t("ctaCoworkerBody")}</p>
        <Link
          href="/sign-up"
          className="mt-3 inline-block rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-medium text-[var(--brand-fg)] hover:opacity-90"
        >
          {t("ctaPostRfq")}
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}
