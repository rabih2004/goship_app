import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function ForwarderHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("FORWARDER", locale);
  const t = await getTranslations({ locale, namespace: "Forwarder" });

  const profile = await db.forwarderProfile.findUnique({
    where: { userId: user.id },
    select: { companyName: true, countryCode: true, onboardingComplete: true },
  });

  const lanes = await db.lane.findMany({
    where: { forwarderId: user.id, active: true },
    select: { originPortUnlocode: true, destinationPortUnlocode: true },
  });
  const laneCount = lanes.length;

  const inboxCount =
    lanes.length === 0
      ? 0
      : await db.shipment.count({
          where: {
            status: "RFQ_OPEN",
            quotes: { none: { forwarderId: user.id } },
            OR: lanes.map((l) => ({
              originPortUnlocode: l.originPortUnlocode,
              destinationPortUnlocode: l.destinationPortUnlocode,
            })),
          },
        });

  const submittedCount = await db.quote.count({
    where: { forwarderId: user.id, status: "PENDING" },
  });

  const bookedCount = await db.booking.count({
    where: { forwarderId: user.id },
  });

  const tO = await getTranslations({ locale, namespace: "Onboarding" });
  const tB = await getTranslations({ locale, namespace: "Booking" });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        {profile?.companyName ?? "Your company"}
      </h1>
      <p className="text-sm text-zinc-500">
        {profile?.countryCode} · {user.email}
      </p>

      {!profile?.onboardingComplete && (
        <Link
          href="/forwarder/onboarding"
          className="mt-6 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
        >
          <div>
            <div className="font-medium">{tO("homeCardCta")} →</div>
            <div className="text-sm">{tO("homeCardBody")}</div>
          </div>
          <span className="text-xl">→</span>
        </Link>
      )}

      <div className="mb-6 flex justify-end">
        <Link href="/forwarder/profile" className="text-sm text-[var(--brand)] underline hover:opacity-80">
          Edit profile →
        </Link>
      </div>

      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          href="/forwarder/rfq"
          big={String(inboxCount)}
          label={t("inboundRfqs")}
          accent
        />
        <Card
          href="/forwarder/lanes"
          big={String(laneCount)}
          label={t("activeLanes")}
        />
        <Card
          href="/forwarder/rfq"
          big={String(submittedCount)}
          label={t("pendingQuotes")}
        />
        <Card
          href="/forwarder/bookings"
          big={String(bookedCount)}
          label={tB("homeCardForwarder")}
        />
      </div>
    </div>
  );
}

function Card({
  href,
  big,
  label,
  accent,
}: {
  href: string;
  big: string;
  label: string;
  accent?: boolean;
}) {
  const cls = accent
    ? "border-[var(--brand)]/40 bg-[var(--brand)]/5 hover:border-[var(--brand)]"
    : "border-zinc-200 bg-white hover:border-zinc-400";
  return (
    <Link href={href} className={`rounded-lg border p-5 transition ${cls}`}>
      <div className="text-2xl font-semibold text-zinc-900">{big}</div>
      <div className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">
        {label}
      </div>
    </Link>
  );
}
