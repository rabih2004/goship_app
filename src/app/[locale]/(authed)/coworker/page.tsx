import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function CoworkerHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const tC = await getTranslations({ locale, namespace: "Coworker" });
  const tO = await getTranslations({ locale, namespace: "Onboarding" });

  const [profile, pendingCount, bookedCount, submittedCount] = await Promise.all([
    db.coworkerProfile.findUnique({
      where: { userId: user.id },
      select: {
        displayName: true,
        countryCode: true,
        cityArea: true,
        onboardingComplete: true,
        serviceRadiusKm: true,
        perKmRateUSDCents: true,
        vehicleType: true,
        serviceCenterLat: true,
        serviceCenterLng: true,
      },
    }),
    // count of submitted-but-pending pickup quotes
    db.coworkerQuote.count({
      where: { coworkerId: user.id, status: "PENDING" },
    }),
    db.booking.count({ where: { coworkerId: user.id } }),
    db.coworkerQuote.count({
      where: { coworkerId: user.id, status: "ACCEPTED" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        {profile?.displayName ?? tC("yourProfile")}
      </h1>
      <p className="text-sm text-zinc-500">
        {profile?.cityArea}
        {profile?.countryCode ? ` · ${profile.countryCode}` : ""} · {user.email}
      </p>

      {!profile?.onboardingComplete && (
        <Link
          href="/coworker/onboarding"
          className="mt-6 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
        >
          <div>
            <div className="font-medium">{tO("homeCardCta")}</div>
            <div className="text-sm">{tO("homeCardBody")}</div>
          </div>
          <span className="text-xl dir-arrow" />
        </Link>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/coworker/rfq"
          className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/5 p-5 transition hover:border-[var(--brand)]"
        >
          <div className="text-base font-semibold text-zinc-900">{tC("inboxCta")}</div>
          <div className="mt-1 text-xs text-zinc-600">{tC("inboxHint")}</div>
        </Link>
        <Link
          href="/coworker/bookings"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <div className="text-2xl font-semibold text-zinc-900">{bookedCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {tC("wonBookings")}
          </div>
        </Link>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-2xl font-semibold text-zinc-900">{pendingCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {tC("pendingQuotes")}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card label={tC("serviceArea")} big={profile?.cityArea ?? "—"}>
          {tC("radiusKm", { km: profile?.serviceRadiusKm ?? 0 })}
        </Card>
        <Card
          label={tC("perKmRate")}
          big={formatPerKm(profile?.perKmRateUSDCents ?? 0)}
        />
        <Card label={tC("vehicleType")} big={profile?.vehicleType ?? "—"} />
      </div>

      {submittedCount > 0 && (
        <p className="mt-6 text-xs text-zinc-500">
          {tC("acceptedCount", { count: submittedCount })}
        </p>
      )}
    </div>
  );
}

function Card({
  label,
  big,
  children,
}: {
  label: string;
  big: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="text-base font-semibold text-zinc-900">{big}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      {children && (
        <div className="mt-2 text-xs text-zinc-600">{children}</div>
      )}
    </div>
  );
}

function formatPerKm(cents: number): string {
  return `$${(cents / 100).toFixed(2)} / km`;
}
