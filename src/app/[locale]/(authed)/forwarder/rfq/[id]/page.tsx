import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { QuoteForm } from "./QuoteForm";

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("FORWARDER", locale);
  const t = await getTranslations({ locale, namespace: "Rfq" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      originPort: { select: { name: true, unlocode: true } },
      destinationPort: { select: { name: true, unlocode: true } },
    },
  });

  if (!shipment || shipment.status !== "RFQ_OPEN") notFound();

  const lane = await db.lane.findFirst({
    where: {
      forwarderId: user.id,
      active: true,
      originPortUnlocode: shipment.originPortUnlocode,
      destinationPortUnlocode: shipment.destinationPortUnlocode,
    },
    select: { transitDays: true },
  });
  if (!lane) notFound();

  const existing = await db.quote.findUnique({
    where: {
      shipmentId_forwarderId: { shipmentId: id, forwarderId: user.id },
    },
    select: { id: true },
  });

  const profile = await db.forwarderProfile.findUnique({
    where: { userId: user.id },
    select: { onboardingComplete: true },
  });
  const onboardingComplete = !!profile?.onboardingComplete;
  const tO = await getTranslations({ locale, namespace: "Onboarding" });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-6">
        <Link
          href="/forwarder/rfq"
          className="text-sm text-[var(--brand)] underline"
        >
          ← {t("backToInbox")}
        </Link>
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
          <Field label={tS("containerType")}>
            {tS(`container.${containerKey(shipment.containerType)}`)}
          </Field>
          <Field label={tS("weightKg")}>{shipment.weightKg} kg</Field>
          <Field label={tS("readyDate")}>
            {shipment.readyDate.toISOString().slice(0, 10)}
          </Field>
          <Field label="INCOTERM">{shipment.incoterm}</Field>
          <Field label={t("yourLaneTransit")}>{lane.transitDays} days</Field>
          <Field label={tS("cargoDescription")}>{shipment.cargoDescription}</Field>
        </dl>

        {shipment.incoterm === "EXW" && shipment.factoryCity && (
          <div className="mt-6 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-sky-700">
              {tS("exwPickupDetails")}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label={tS("factoryAddress")}>
                {shipment.factoryAddressLine}
              </Field>
              <Field label={tS("factoryCity")}>{shipment.factoryCity}</Field>
            </dl>
            <p className="mt-2 text-xs text-sky-700">
              {t("exwForwarderNote")}
            </p>
          </div>
        )}
      </div>

      <h2 className="mt-10 mb-4 text-base font-medium text-zinc-900">
        {t("quoteFormTitle")}
      </h2>

      {existing ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t("alreadyQuoted")}
        </p>
      ) : !onboardingComplete ? (
        <Link
          href="/forwarder/onboarding"
          className="block rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100"
        >
          {tO("homeCardCta")} →
          <div className="text-xs text-amber-800">{tO("homeCardBody")}</div>
        </Link>
      ) : (
        <QuoteForm shipmentId={shipment.id} locale={locale} />
      )}
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
