import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ChatPanel } from "@/components/ChatPanel";

export default async function CustomsBookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("CUSTOMS_AGENT", locale);
  const tB = await getTranslations({ locale, namespace: "Booking" });

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      shipment: {
        select: {
          cargoDescription: true,
          weightKg: true,
          incoterm: true,
          originPort: { select: { name: true, unlocode: true } },
          destinationPort: { select: { name: true, unlocode: true } },
        },
      },
      customer: { select: { email: true, name: true } },
      forwarder: {
        select: {
          email: true,
          name: true,
          forwarderProfile: { select: { companyName: true } },
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
      customsQuote: { select: { etaDays: true, notes: true } },
      trackingEvents: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { stage: true },
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

  if (!booking || booking.customsAgentId !== user.id) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/customs/bookings"
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
          {tB("clearanceAt")} {booking.shipment.destinationPort.name} ({booking.shipment.destinationPort.unlocode})
        </h1>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <Field label={tB("amountPaid")}>
            {formatUSD(booking.customsAmountUSDCents)}
          </Field>
          <Field label={tB("yourPayout")}>
            {formatUSD(booking.customsAmountUSDCents)}
          </Field>
          <Field label={tB("customer")}>
            {booking.customer.name ?? booking.customer.email}
          </Field>
          <Field label="Origin port">
            {booking.shipment.originPort.name} ({booking.shipment.originPort.unlocode})
          </Field>
          <Field label="INCOTERM">{booking.shipment.incoterm}</Field>
          {booking.customsQuote?.etaDays && (
            <Field label="ETA (days after arrival)">
              {booking.customsQuote.etaDays}
            </Field>
          )}
        </dl>

        <div className="mt-6 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Cargo
          </div>
          <div className="mt-0.5">{booking.shipment.cargoDescription}</div>
          <div className="mt-0.5 text-xs text-sky-700">
            {booking.shipment.weightKg} kg
          </div>
        </div>
      </div>

      <ChatPanel
        bookingId={booking.id}
        currentUserId={user.id}
        locale={locale}
      />

      <ReviewPanel
        bookingId={booking.id}
        currentUserId={user.id}
        delivered={booking.trackingEvents[0]?.stage === "DELIVERED"}
        parties={buildPartiesCa(booking)}
        reviews={booking.reviews}
        locale={locale}
      />
    </div>
  );
}

function buildPartiesCa(b: {
  customerId: string;
  customer: { email: string; name: string | null };
  forwarderId: string;
  forwarder: {
    email: string;
    name: string | null;
    forwarderProfile: { companyName: string } | null;
  } | null;
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
  ];
  if (b.forwarder) {
    out.push({
      userId: b.forwarderId,
      role: "FORWARDER",
      name:
        b.forwarder.forwarderProfile?.companyName ??
        b.forwarder.name ??
        b.forwarder.email,
    });
  }
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
