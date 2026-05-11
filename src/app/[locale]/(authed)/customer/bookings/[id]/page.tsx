import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";
import { isMock } from "@/lib/payments";

const STAGES = ["BOOKED", "LOADED", "DEPARTED", "ARRIVED", "CLEARED", "DELIVERED"] as const;
type Stage = (typeof STAGES)[number];

export default async function CustomerBookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ just_booked?: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("CUSTOMER", locale);
  const tB = await getTranslations({ locale, namespace: "Booking" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });
  const tD = await getTranslations({ locale, namespace: "Documents" });

  const sp = await searchParams;
  const justBooked = sp.just_booked === "1";

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      shipment: {
        select: {
          containerType: true,
          weightKg: true,
          readyDate: true,
          incoterm: true,
          cargoDescription: true,
          originPort: { select: { name: true, unlocode: true } },
          destinationPort: { select: { name: true, unlocode: true } },
        },
      },
      forwarder: {
        select: {
          email: true,
          forwarderProfile: { select: { companyName: true, countryCode: true } },
        },
      },
      quote: {
        select: { transitDays: true, carrierName: true },
      },
      trackingEvents: {
        orderBy: { occurredAt: "asc" },
        select: { stage: true, occurredAt: true, notes: true },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          type: true,
          filename: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!booking || booking.customerId !== user.id) notFound();

  const reachedStages = new Set<Stage>(
    booking.trackingEvents.map((e) => e.stage as Stage)
  );
  const currentStage =
    booking.trackingEvents[booking.trackingEvents.length - 1]?.stage ?? "BOOKED";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/customer/bookings"
          className="text-sm text-[var(--brand)] underline"
        >
          ← {tB("backToList")}
        </Link>
        <span className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800">
          {tB(`stages.${currentStage}`)}
        </span>
      </div>

      {justBooked && (
        <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {isMock() ? tB("justBookedMock") : tB("justBookedReal")}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
          {tB("bookingNumber")}
        </div>
        <div className="font-mono text-xl font-semibold text-zinc-900">
          {booking.bookingNumber}
        </div>
        <h1 className="mt-4 text-lg font-medium text-zinc-900">
          {booking.shipment.originPort.name}
          <span className="px-2 text-zinc-400 dir-arrow" />
          {booking.shipment.destinationPort.name}
        </h1>
        <div className="text-xs text-zinc-500">
          {booking.shipment.originPort.unlocode} ·{" "}
          {booking.shipment.destinationPort.unlocode}
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <Field label={tB("amountPaid")}>
            {formatUSD(booking.totalUSDCents)}
          </Field>
          <Field label={tB("paidAt")}>
            {booking.paidAt
              ? booking.paidAt.toISOString().slice(0, 16).replace("T", " ")
              : "—"}
          </Field>
          <Field label={tB("forwarder")}>
            {booking.forwarder.forwarderProfile?.companyName ??
              booking.forwarder.email}
          </Field>
          <Field label={tB("carrier")}>{booking.quote.carrierName}</Field>
          <Field label={tB("transitDays")}>{booking.quote.transitDays}</Field>
          <Field label="INCOTERM">{booking.shipment.incoterm}</Field>
        </dl>
      </div>

      <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
        {tB("trackingTitle")}
      </h2>
      <ol className="rounded-lg border border-zinc-200 bg-white">
        {STAGES.map((stage, idx) => {
          const reached = reachedStages.has(stage);
          const event = booking.trackingEvents.find((e) => e.stage === stage);
          return (
            <li
              key={stage}
              className={
                "flex items-start gap-4 border-b border-zinc-100 px-5 py-3 last:border-0" +
                (reached ? "" : " text-zinc-400")
              }
            >
              <div
                className={
                  "mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium " +
                  (reached
                    ? "bg-[var(--brand)] text-[var(--brand-fg)]"
                    : "border border-zinc-200 bg-white text-zinc-400")
                }
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {tB(`stages.${stage}`)}
                </div>
                {event && (
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {event.occurredAt
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}
                    {event.notes ? ` · ${event.notes}` : ""}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-zinc-500">{tB("trackingHint")}</p>

      <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
        {tD("title")}
      </h2>
      {booking.documents.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {tD("emptyCustomer")}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {booking.documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">{d.filename}</div>
                <div className="text-xs text-zinc-500">
                  {tD(`type${d.type}`)} ·{" "}
                  {d.uploadedAt.toISOString().slice(0, 10)}
                </div>
              </div>
              <a
                href={`/api/documents/${d.id}`}
                className="text-sm text-[var(--brand)] underline"
              >
                {tD("download")}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <h3 className="mb-2 text-base font-medium text-zinc-900">
          {tS("shipmentDetails")}
        </h3>
        <dl className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm sm:grid-cols-2">
          <Field label={tS("containerType")}>{booking.shipment.containerType}</Field>
          <Field label={tS("weightKg")}>{booking.shipment.weightKg} kg</Field>
          <Field label={tS("readyDate")}>
            {booking.shipment.readyDate.toISOString().slice(0, 10)}
          </Field>
          <Field label={tS("cargoDescription")}>
            {booking.shipment.cargoDescription}
          </Field>
        </dl>
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
