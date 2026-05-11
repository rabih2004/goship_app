import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";

export default async function CoworkerBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const tB = await getTranslations({ locale, namespace: "Booking" });

  const bookings = await db.booking.findMany({
    where: { coworkerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      shipment: {
        select: {
          factoryCity: true,
          factoryAddressLine: true,
          originPort: { select: { name: true, unlocode: true } },
        },
      },
      customer: { select: { email: true, name: true } },
      trackingEvents: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { stage: true },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {tB("listTitleCoworker")}
        </h1>
        <Link href="/coworker" className="text-sm text-[var(--brand)] underline">
          <span className="dir-back" /> {tB("backToDashboard")}
        </Link>
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {tB("emptyListCoworker")}
        </p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const lastStage = b.trackingEvents[0]?.stage ?? "BOOKED";
            return (
              <li
                key={b.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <Link
                  href={`/coworker/bookings/${b.id}`}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-mono text-sm text-zinc-900">
                      {b.bookingNumber}
                    </div>
                    <div className="mt-1 text-sm text-zinc-700">
                      {b.shipment.factoryCity ?? b.shipment.factoryAddressLine}
                      <span className="px-2 text-zinc-400 dir-arrow" />
                      {b.shipment.originPort.name} (
                      {b.shipment.originPort.unlocode})
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {b.customer.name ?? b.customer.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                      {tB(`stages.${lastStage}`)}
                    </span>
                    <div className="text-end">
                      <div className="text-base font-semibold text-zinc-900">
                        {formatUSD(b.pickupAmountUSDCents)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {b.createdAt.toISOString().slice(0, 10)}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
