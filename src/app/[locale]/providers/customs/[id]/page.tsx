import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { RatingStars } from "@/components/RatingStars";

export default async function CustomsAgentProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Providers" });

  const profile = await db.customsAgentProfile.findUnique({
    where: { userId: id },
    select: {
      userId: true,
      displayName: true,
      countryCode: true,
      operationCities: true,
      licenseNumber: true,
      baseFeeUSDCents: true,
      docSetFeeUSDCents: true,
      onboardingComplete: true,
      ratingAvg: true,
      ratingCount: true,
      user: { select: { suspended: true } },
    },
  });

  if (!profile || !profile.onboardingComplete || profile.user.suspended) {
    notFound();
  }

  const completedClearances = await db.booking.count({
    where: {
      customsAgentId: id,
      trackingEvents: { some: { stage: "DELIVERED" } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/providers/customs"
        className="text-sm text-[var(--brand)] underline"
      >
        <span className="dir-back" /> {t("backToCustoms")}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-zinc-900">
        {profile.displayName}
      </h1>
      <div className="mt-1 text-sm uppercase tracking-wide text-zinc-500">
        {profile.countryCode}
        {profile.licenseNumber ? ` · ${profile.licenseNumber}` : ""}
      </div>
      <div className="mt-3">
        <RatingStars avg={profile.ratingAvg} count={profile.ratingCount} />
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label={t("statCompletedClearances")}
          value={String(completedClearances)}
        />
        <Stat
          label={t("statBaseFee")}
          value={`$${(profile.baseFeeUSDCents / 100).toFixed(0)}`}
        />
        <Stat label={t("statRating")} value={profile.ratingAvg.toFixed(1)} />
      </dl>

      {profile.operationCities && (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-medium text-zinc-900">
            {t("citiesTitle")}
          </h2>
          <p className="mt-2 text-sm text-zinc-700">{profile.operationCities}</p>
        </div>
      )}

      <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm text-zinc-700">{t("ctaCustomsBody")}</p>
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
