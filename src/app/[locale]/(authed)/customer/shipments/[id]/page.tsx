import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { rankQuotes } from "@/lib/quotes";
import { formatUSD } from "@/lib/money";
import { MoneyAmount } from "@/components/MoneyAmount";
import { isMock } from "@/lib/payments";

import { AcceptQuoteButton } from "./AcceptQuoteButton";
import { MultiLegBookingForm } from "./MultiLegBookingForm";
import { RatingStars } from "@/components/RatingStars";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("CUSTOMER", locale);
  const t = await getTranslations({ locale, namespace: "Shipments" });
  const tQ = await getTranslations({ locale, namespace: "Quotes" });
  const tB = await getTranslations({ locale, namespace: "Booking" });

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      originPort: { select: { name: true, unlocode: true } },
      destinationPort: { select: { name: true, unlocode: true } },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          totalUSDCents: true,
          paidAt: true,
        },
      },
      quotes: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        include: {
          forwarder: {
            select: {
              email: true,
              forwarderProfile: {
                select: { companyName: true, ratingAvg: true, ratingCount: true },
              },
            },
          },
        },
      },
      coworkerQuotes: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        include: {
          coworker: {
            select: {
              email: true,
              coworkerProfile: {
                select: { displayName: true, ratingAvg: true, ratingCount: true },
              },
            },
          },
        },
      },
      customsQuotes: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        include: {
          customsAgent: {
            select: {
              email: true,
              customsAgentProfile: {
                select: { displayName: true, ratingAvg: true, ratingCount: true },
              },
            },
          },
        },
      },
    },
  });

  if (!shipment || shipment.customerId !== user.id) notFound();

  const mockMode = isMock();
  const isBooked = shipment.status === "BOOKED" && shipment.booking;
  const isExw = shipment.incoterm === "EXW";
  const needsCustoms = shipment.needsCustomsClearance;
  const isMultiLeg = isExw || needsCustoms;
  const pendingQuotes = shipment.quotes.filter((q) => q.status === "PENDING");
  const pendingPickups = shipment.coworkerQuotes.filter(
    (q) => q.status === "PENDING"
  );
  const pendingCustoms = shipment.customsQuotes.filter(
    (q) => q.status === "PENDING"
  );

  const ranked = rankQuotes(
    pendingQuotes.map((q) => ({
      id: q.id,
      priceUSDCents: q.priceUSDCents,
      transitDays: q.transitDays,
      forwarderRating: q.forwarder.forwarderProfile?.ratingAvg ?? 0,
      forwarderRatingCount: q.forwarder.forwarderProfile?.ratingCount ?? 0,
      carrierName: q.carrierName,
      validUntil: q.validUntil,
      forwarderId: q.forwarderId,
      forwarderName:
        q.forwarder.forwarderProfile?.companyName ?? q.forwarder.email,
    }))
  );

  const pickupOptions = pendingPickups
    .map((p) => ({
      id: p.id,
      coworkerName:
        p.coworker.coworkerProfile?.displayName ?? p.coworker.email,
      vehicleNote: p.vehicleNote,
      distanceKm: p.distanceKm,
      priceUSDCents: p.priceUSDCents,
    }))
    .sort((a, b) => a.priceUSDCents - b.priceUSDCents);

  const customsOptions = pendingCustoms
    .map((c) => ({
      id: c.id,
      agentName:
        c.customsAgent.customsAgentProfile?.displayName ?? c.customsAgent.email,
      etaDays: c.etaDays,
      priceUSDCents: c.priceUSDCents,
    }))
    .sort((a, b) => a.priceUSDCents - b.priceUSDCents);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/customer/shipments"
          className="text-sm text-[var(--brand)] underline"
        >
          ← {t("backToList")}
        </Link>
        <span
          className={
            isBooked
              ? "rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800"
              : "rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
          }
        >
          {t(`statusLabels.${shipment.status}`)}
        </span>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-zinc-900">
          {shipment.originPort.name}
          <span className="px-2 text-zinc-400 dir-arrow" />
          {shipment.destinationPort.name}
        </h1>
        <div className="mt-1 text-xs text-zinc-500">
          {shipment.originPort.unlocode} · {shipment.destinationPort.unlocode}
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <Field label={t("containerType")}>
            {t(`container.${containerKey(shipment.containerType)}`)}
          </Field>
          <Field label={t("weightKg")}>{shipment.weightKg} kg</Field>
          <Field label={t("readyDate")}>
            {shipment.readyDate.toISOString().slice(0, 10)}
          </Field>
          <Field label="INCOTERM">{shipment.incoterm}</Field>
          <Field label={t("cargoDescription")}>{shipment.cargoDescription}</Field>
        </dl>

        {shipment.incoterm === "EXW" && shipment.factoryCity && (
          <div className="mt-6 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-sky-700">
              {t("exwPickupDetails")}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label={t("factoryAddress")}>
                {shipment.factoryAddressLine}
              </Field>
              <Field label={t("factoryCity")}>{shipment.factoryCity}</Field>
              <Field label={t("pickupContactName")}>
                {shipment.pickupContactName}
              </Field>
              <Field label={t("pickupContactPhone")}>
                {shipment.pickupContactPhone}
              </Field>
            </dl>
          </div>
        )}
      </div>

      {isBooked && shipment.booking ? (
        <BookingPanel
          bookingNumber={shipment.booking.bookingNumber}
          bookingId={shipment.booking.id}
          totalCents={shipment.booking.totalUSDCents}
          paidAt={shipment.booking.paidAt}
          locale={locale}
          tB={tB}
        />
      ) : isMultiLeg ? (
        <div className="mt-10">
          <h2 className="mb-3 text-base font-medium text-zinc-900">
            {tQ("incoming", { count: ranked.length })}
          </h2>
          <MultiLegBookingForm
            shipmentId={shipment.id}
            locale={locale}
            needsPickup={isExw}
            needsCustoms={needsCustoms}
            freight={ranked.map((q) => ({
              id: q.id,
              forwarderName: q.forwarderName,
              carrierName: q.carrierName,
              priceUSDCents: q.priceUSDCents,
              transitDays: q.transitDays,
              isCheapest: q.isCheapest,
              isFastest: q.isFastest,
            }))}
            pickup={pickupOptions}
            customs={customsOptions}
          />
        </div>
      ) : (
        <>
          <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
            {tQ("incoming", { count: ranked.length })}
          </h2>

          {ranked.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              {tQ("waiting")}
            </p>
          ) : (
            <ul className="space-y-3">
              {ranked.map((q) => (
                <li
                  key={q.id}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/providers/forwarders/${q.forwarderId}`}
                        className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                      >
                        {q.forwarderName}
                      </Link>
                      <RatingStars
                        avg={q.forwarderRating}
                        count={q.forwarderRatingCount}
                        size="sm"
                      />
                      {q.isCheapest && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          {tQ("cheapest")}
                        </span>
                      )}
                      {q.isFastest && !q.isCheapest && (
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                          {tQ("fastest")}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {tQ("carrier")}: {q.carrierName} ·{" "}
                      {tQ("validUntil", {
                        date: q.validUntil.toISOString().slice(0, 10),
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-end">
                      <div className="text-2xl font-semibold text-zinc-900">
                        <MoneyAmount usdCents={q.priceUSDCents} locale={locale} />
                      </div>
                      <div className="text-xs text-zinc-500">
                        {tQ("transitDays", { days: q.transitDays })}
                      </div>
                    </div>
                    <AcceptQuoteButton
                      shipmentId={shipment.id}
                      quoteId={q.id}
                      locale={locale}
                      mockMode={mockMode}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function BookingPanel({
  bookingNumber,
  bookingId,
  totalCents,
  paidAt,
  locale,
  tB,
}: {
  bookingNumber: string;
  bookingId: string;
  totalCents: number;
  paidAt: Date | null;
  locale: AppLocale;
  tB: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="mt-10 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="text-base font-medium text-emerald-900">
        {tB("confirmedTitle")}
      </h2>
      <p className="mt-1 text-sm text-emerald-800">{tB("confirmedBody")}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-700">
            {tB("bookingNumber")}
          </dt>
          <dd className="mt-0.5 font-mono text-emerald-900">{bookingNumber}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-700">
            {tB("amountPaid")}
          </dt>
          <dd className="mt-0.5 text-emerald-900">
            <MoneyAmount usdCents={totalCents} locale={locale} showUSDAside />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-700">
            {tB("paidAt")}
          </dt>
          <dd className="mt-0.5 text-emerald-900">
            {paidAt ? paidAt.toISOString().slice(0, 16).replace("T", " ") : "—"}
          </dd>
        </div>
      </dl>
      <Link
        href={`/customer/bookings/${bookingId}`}
        className="mt-4 inline-block text-sm font-medium text-emerald-900 underline"
      >
        {tB("viewBooking")} →
      </Link>
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

function containerKey(c: string): "twentyFt" | "fortyFt" | "fortyHC" | "lcl" {
  if (c === "TWENTY_FT") return "twentyFt";
  if (c === "FORTY_HC") return "fortyHC";
  if (c === "LCL") return "lcl";
  return "fortyFt";
}
