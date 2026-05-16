import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";
import { isMock } from "@/lib/payments";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { MoneyAmount } from "@/components/MoneyAmount";
import { VesselMap } from "@/components/VesselMap";
import { getVesselPosition } from "@/lib/vessel-tracking";
import { DisputePanel } from "@/components/DisputePanel";

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
  const tIns = await getTranslations({ locale, namespace: "Insurance" });

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
          originPort: { select: { name: true, unlocode: true, lat: true, lng: true } },
          destinationPort: { select: { name: true, unlocode: true, lat: true, lng: true } },
        },
      },
      forwarder: {
        select: {
          email: true,
          name: true,
          forwarderProfile: { select: { companyName: true, countryCode: true } },
        },
      },
      coworker: {
        select: {
          email: true,
          name: true,
          coworkerProfile: { select: { displayName: true } },
        },
      },
      customsAgent: {
        select: {
          email: true,
          name: true,
          customsAgentProfile: { select: { displayName: true } },
        },
      },
      customer: { select: { email: true, name: true } },
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
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          raterUserId: true,
          ratedUserId: true,
          score: true,
          comment: true,
          createdAt: true,
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

  const vesselPosition = await getVesselPosition({
    origin: {
      lat: booking.shipment.originPort.lat,
      lng: booking.shipment.originPort.lng,
    },
    destination: {
      lat: booking.shipment.destinationPort.lat,
      lng: booking.shipment.destinationPort.lng,
    },
    events: booking.trackingEvents.map((e) => ({
      stage: e.stage,
      occurredAt: e.occurredAt,
    })),
    transitDays: booking.quote.transitDays,
  }).catch(() => null);

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
            <MoneyAmount
              usdCents={booking.totalUSDCents}
              locale={locale}
              showUSDAside
            />
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

        {booking.insuranceUSDCents > 0 && booking.cargoValueUSDCents && (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <span className="font-medium">{tIns("insured")}</span> ·{" "}
            {tIns("premiumLine", {
              premium: formatUSD(booking.insuranceUSDCents),
              rate: "1.5%",
              value: formatUSD(booking.cargoValueUSDCents),
            })}
          </div>
        )}
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

      {vesselPosition &&
        booking.shipment.originPort.lat != null &&
        booking.shipment.originPort.lng != null &&
        booking.shipment.destinationPort.lat != null &&
        booking.shipment.destinationPort.lng != null && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-900">
              {tB("vesselPositionTitle")}
            </h3>
            <VesselMap
              origin={{
                lat: booking.shipment.originPort.lat,
                lng: booking.shipment.originPort.lng,
                name: booking.shipment.originPort.name,
                unlocode: booking.shipment.originPort.unlocode,
              }}
              destination={{
                lat: booking.shipment.destinationPort.lat,
                lng: booking.shipment.destinationPort.lng,
                name: booking.shipment.destinationPort.name,
                unlocode: booking.shipment.destinationPort.unlocode,
              }}
              vessel={{
                lat: vesselPosition.lat,
                lng: vesselPosition.lng,
                fraction: vesselPosition.fraction,
              }}
            />
            <p className="mt-2 text-xs text-zinc-500">
              {tB("vesselPositionHint", {
                eta: new Date(vesselPosition.etaMs)
                  .toISOString()
                  .slice(0, 10),
              })}
            </p>
          </div>
        )}

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

      <ChatPanel
        bookingId={booking.id}
        currentUserId={user.id}
        locale={locale}
      />

      <DisputePanel bookingId={booking.id} locale={locale} />

      <ReviewPanel
        bookingId={booking.id}
        currentUserId={user.id}
        delivered={currentStage === "DELIVERED"}
        parties={buildParties(booking)}
        reviews={booking.reviews}
        locale={locale}
      />
    </div>
  );
}

function buildParties(b: {
  customerId: string;
  customer: { email: string; name: string | null };
  forwarderId: string;
  forwarder: {
    email: string;
    name: string | null;
    forwarderProfile: { companyName: string } | null;
  };
  coworkerId: string | null;
  coworker: {
    email: string;
    name: string | null;
    coworkerProfile: { displayName: string } | null;
  } | null;
  customsAgentId: string | null;
  customsAgent: {
    email: string;
    name: string | null;
    customsAgentProfile: { displayName: string } | null;
  } | null;
}) {
  const out: Array<{
    userId: string;
    role: "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT";
    name: string;
  }> = [
    {
      userId: b.customerId,
      role: "CUSTOMER",
      name: b.customer.name ?? b.customer.email,
    },
    {
      userId: b.forwarderId,
      role: "FORWARDER",
      name:
        b.forwarder.forwarderProfile?.companyName ??
        b.forwarder.name ??
        b.forwarder.email,
    },
  ];
  if (b.coworkerId && b.coworker) {
    out.push({
      userId: b.coworkerId,
      role: "COWORKER",
      name:
        b.coworker.coworkerProfile?.displayName ??
        b.coworker.name ??
        b.coworker.email,
    });
  }
  if (b.customsAgentId && b.customsAgent) {
    out.push({
      userId: b.customsAgentId,
      role: "CUSTOMS_AGENT",
      name:
        b.customsAgent.customsAgentProfile?.displayName ??
        b.customsAgent.name ??
        b.customsAgent.email,
    });
  }
  return out;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{children}</dd>
    </div>
  );
}
