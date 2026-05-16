import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { RatingStars } from "@/components/RatingStars";

export default async function ForwarderProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Providers" });

  const profile = await db.forwarderProfile.findUnique({
    where: { userId: id },
    select: {
      userId: true,
      companyName: true,
      countryCode: true,
      onboardingComplete: true,
      ratingAvg: true,
      ratingCount: true,
      user: { select: { suspended: true } },
      lanes: {
        where: { active: true },
        orderBy: { transitDays: "asc" },
        select: {
          id: true,
          transitDays: true,
          originPort: { select: { name: true, unlocode: true, country: true } },
          destinationPort: { select: { name: true, unlocode: true, country: true } },
        },
      },
    },
  });

  if (!profile || !profile.onboardingComplete || profile.user.suspended) {
    notFound();
  }

  // Completed-booking count is a trust signal — pull as a single count.
  const completedBookings = await db.booking.count({
    where: {
      forwarderId: id,
      trackingEvents: { some: { stage: "DELIVERED" } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link
        href="/providers/forwarders"
        className="text-sm text-[var(--brand)] underline"
      >
        <span className="dir-back" /> {t("backToForwarders")}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-zinc-900">
        {profile.companyName}
      </h1>
      <div className="mt-1 text-sm uppercase tracking-wide text-zinc-500">
        {profile.countryCode}
      </div>
      <div className="mt-3">
        <RatingStars avg={profile.ratingAvg} count={profile.ratingCount} />
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label={t("statCompletedBookings")} value={String(completedBookings)} />
        <Stat label={t("statActiveLanes")} value={String(profile.lanes.length)} />
        <Stat label={t("statRating")} value={profile.ratingAvg.toFixed(1)} />
      </dl>

      <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
        {t("lanesTitle")}
      </h2>
      {profile.lanes.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {t("emptyLanes")}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {profile.lanes.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="text-zinc-900">
                {l.originPort.name}
                <span className="px-2 text-zinc-400 dir-arrow" />
                {l.destinationPort.name}
                <div className="mt-0.5 text-xs text-zinc-500">
                  {l.originPort.unlocode} · {l.destinationPort.unlocode}
                </div>
              </div>
              <div className="text-xs text-zinc-600">
                {t("transitDays", { days: l.transitDays })}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm text-zinc-700">{t("ctaBody")}</p>
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
