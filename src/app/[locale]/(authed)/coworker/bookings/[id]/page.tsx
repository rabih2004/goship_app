import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";

export default async function CoworkerBookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const tB = await getTranslations({ locale, namespace: "Booking" });

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      shipment: {
        select: {
          factoryAddressLine: true,
          factoryCity: true,
          pickupContactName: true,
          pickupContactPhone: true,
          originPort: { select: { name: true, unlocode: true } },
        },
      },
      customer: { select: { email: true, name: true } },
      pickupQuote: {
        select: { distanceKm: true, vehicleNote: true, notes: true, pickupTime: true },
      },
    },
  });

  if (!booking || booking.coworkerId !== user.id) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/coworker/bookings"
          className="text-sm text-[var(--brand)] underline"
        >
          <span className="dir-back" /> {tB("backToList")}
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
          {tB("bookingNumber")}
        </div>
        <div className="font-mono text-xl font-semibold text-zinc-900">
          {booking.bookingNumber}
        </div>

        <h1 className="mt-4 text-lg font-medium text-zinc-900">
          {booking.shipment.factoryCity ?? booking.shipment.factoryAddressLine}
          <span className="px-2 text-zinc-400 dir-arrow" />
          {booking.shipment.originPort.name} ({booking.shipment.originPort.unlocode})
        </h1>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <Field label={tB("amountPaid")}>
            {formatUSD(booking.pickupAmountUSDCents)}
          </Field>
          <Field label={tB("yourPayout")}>
            {formatUSD(booking.pickupAmountUSDCents)}
          </Field>
          <Field label={tB("customer")}>
            {booking.customer.name ?? booking.customer.email}
          </Field>
          {booking.pickupQuote?.distanceKm && (
            <Field label="Distance">
              {booking.pickupQuote.distanceKm} km
            </Field>
          )}
          {booking.pickupQuote?.vehicleNote && (
            <Field label="Vehicle">{booking.pickupQuote.vehicleNote}</Field>
          )}
          {booking.pickupQuote?.pickupTime && (
            <Field label="Pickup time">
              {booking.pickupQuote.pickupTime
                .toISOString()
                .slice(0, 16)
                .replace("T", " ")}
            </Field>
          )}
        </dl>

        <div className="mt-6 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="text-xs font-medium uppercase tracking-wide text-sky-700">
            {tB("pickupAt")}
          </div>
          <div className="mt-0.5">{booking.shipment.factoryAddressLine}</div>
          <div className="mt-0.5 text-xs text-sky-700">
            {booking.shipment.pickupContactName} · {booking.shipment.pickupContactPhone}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{children}</dd>
    </div>
  );
}
