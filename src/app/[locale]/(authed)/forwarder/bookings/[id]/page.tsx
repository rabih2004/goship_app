import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";

import { AdvanceStageForm } from "./AdvanceStageForm";
import { UploadDocumentForm } from "./UploadDocumentForm";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ChatPanel } from "@/components/ChatPanel";

const STAGES = ["BOOKED", "LOADED", "DEPARTED", "ARRIVED", "CLEARED", "DELIVERED"] as const;
type Stage = (typeof STAGES)[number];

export default async function ForwarderBookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("FORWARDER", locale);
  const tB = await getTranslations({ locale, namespace: "Booking" });
  const tT = await getTranslations({ locale, namespace: "Tracking" });
  const tD = await getTranslations({ locale, namespace: "Documents" });

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
      quote: { select: { transitDays: true, carrierName: true } },
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
          contentType: true,
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

  if (!booking || booking.forwarderId !== user.id) notFound();

  const reachedStages = new Set<Stage>(
    booking.trackingEvents.map((e) => e.stage as Stage)
  );
  const currentStage =
    (booking.trackingEvents[booking.trackingEvents.length - 1]?.stage as Stage) ??
    "BOOKED";
  const idx = STAGES.indexOf(currentStage);
  const nextStage = STAGES[idx + 1] ?? null;
  const atFinal = currentStage === "DELIVERED";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/forwarder/bookings"
          className="text-sm text-[var(--brand)] underline"
        >
          ← {tB("backToList")}
        </Link>
        <span className="rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800">
          {tB(`stages.${currentStage}`)}
        </span>
      </div>

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
          <Field label={tB("amountPaid")}>{formatUSD(booking.totalUSDCents)}</Field>
          <Field label={tB("yourPayout")}>
            {formatUSD(booking.totalUSDCents - booking.platformFeeUSDCents)}
          </Field>
          <Field label={tB("platformFee")}>
            {formatUSD(booking.platformFeeUSDCents)}
          </Field>
          <Field label={tB("customer")}>
            {booking.customer.name ?? booking.customer.email}
          </Field>
          <Field label={tB("carrier")}>{booking.quote.carrierName}</Field>
          <Field label={tB("transitDays")}>{booking.quote.transitDays}</Field>
        </dl>
      </div>

      <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
        {tT("title")}
      </h2>
      <ol className="mb-4 rounded-lg border border-zinc-200 bg-white">
        {STAGES.map((stage, i) => {
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
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{tB(`stages.${stage}`)}</div>
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

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <AdvanceStageForm
          bookingId={booking.id}
          locale={locale}
          nextStageLabel={nextStage ? (await tBookingStageLabel(locale, nextStage)) : null}
          disabled={atFinal}
        />
      </div>

      <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
        {tD("title")}
      </h2>

      {booking.documents.length === 0 ? (
        <p className="mb-4 rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {tD("emptyForwarder")}
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {booking.documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  {d.filename}
                </div>
                <div className="text-xs text-zinc-500">
                  {tD(`type${d.type}`)} · {formatBytes(d.sizeBytes)} ·{" "}
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

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-medium text-zinc-900">{tD("uploadTitle")}</h3>
        <UploadDocumentForm bookingId={booking.id} locale={locale} />
      </div>

      <ChatPanel
        bookingId={booking.id}
        currentUserId={user.id}
        locale={locale}
      />

      <ReviewPanel
        bookingId={booking.id}
        currentUserId={user.id}
        delivered={currentStage === "DELIVERED"}
        parties={buildPartiesFwd(booking)}
        reviews={booking.reviews}
        locale={locale}
      />
    </div>
  );
}

function buildPartiesFwd(b: {
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

async function tBookingStageLabel(
  locale: AppLocale,
  stage: Stage
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "Booking" });
  return t(`stages.${stage}`);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{children}</dd>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
