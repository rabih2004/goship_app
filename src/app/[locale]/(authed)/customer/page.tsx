import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function CustomerHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("CUSTOMER", locale);
  const t = await getTranslations({ locale, namespace: "Shipments" });

  const [openCount, totalQuotes, bookingCount] = await Promise.all([
    db.shipment.count({ where: { customerId: user.id, status: "RFQ_OPEN" } }),
    db.quote.count({
      where: { shipment: { customerId: user.id }, status: "PENDING" },
    }),
    db.booking.count({ where: { customerId: user.id } }),
  ]);

  const tB = await getTranslations({ locale, namespace: "Booking" });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
        {t("welcome")}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{user.email}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Primary CTA */}
        <Link
          href="/customer/shipments/new"
          className="group rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-5 transition hover:border-brand-500 hover:bg-brand-100"
        >
          <div className="flex items-center gap-2 text-base font-semibold text-brand-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("newShipment")}
          </div>
          <div className="mt-1.5 text-xs text-brand-700/80">
            {t("newShipmentHint")}
          </div>
        </Link>

        <StatCard
          href="/customer/shipments"
          value={openCount}
          label={t("openRfqs")}
        />
        <StatCard
          href="/customer/shipments"
          value={totalQuotes}
          label={t("incomingQuotes")}
        />
        <StatCard
          href="/customer/bookings"
          value={bookingCount}
          label={tB("homeCard")}
        />
      </div>
    </div>
  );
}

function StatCard({
  href,
  value,
  label,
}: {
  href: string;
  value: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="text-3xl font-semibold tracking-tight text-zinc-900">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </Link>
  );
}
