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
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        {t("welcome")}
      </h1>
      <p className="text-sm text-zinc-500">{user.email}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/customer/shipments/new"
          className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/5 p-5 transition hover:border-[var(--brand)]"
        >
          <div className="text-base font-medium text-zinc-900">
            + {t("newShipment")}
          </div>
          <div className="mt-1 text-xs text-zinc-600">{t("newShipmentHint")}</div>
        </Link>

        <Link
          href="/customer/shipments"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <div className="text-2xl font-semibold text-zinc-900">{openCount}</div>
          <div className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">
            {t("openRfqs")}
          </div>
        </Link>

        <Link
          href="/customer/shipments"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <div className="text-2xl font-semibold text-zinc-900">{totalQuotes}</div>
          <div className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">
            {t("incomingQuotes")}
          </div>
        </Link>

        <Link
          href="/customer/bookings"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <div className="text-2xl font-semibold text-zinc-900">{bookingCount}</div>
          <div className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">
            {tB("homeCard")}
          </div>
        </Link>
      </div>
    </div>
  );
}
