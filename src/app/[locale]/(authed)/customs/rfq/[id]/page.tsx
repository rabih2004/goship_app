import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";

import { CustomsQuoteForm } from "./CustomsQuoteForm";

export default async function CustomsRfqDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("CUSTOMS_AGENT", locale);
  const tR = await getTranslations({ locale, namespace: "CustomsRfq" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });

  const [profile, shipment, existing] = await Promise.all([
    db.customsAgentProfile.findUnique({
      where: { userId: user.id },
      select: {
        onboardingComplete: true,
        countryCode: true,
        baseFeeUSDCents: true,
        docSetFeeUSDCents: true,
      },
    }),
    db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        originPort: { select: { name: true, unlocode: true } },
        destinationPort: { select: { name: true, unlocode: true, country: true } },
      },
    }),
    db.customsQuote.findUnique({
      where: {
        shipmentId_customsAgentId: { shipmentId: id, customsAgentId: user.id },
      },
      select: { id: true, priceUSDCents: true, status: true },
    }),
  ]);

  if (!profile || !shipment) notFound();
  if (!shipment.needsCustomsClearance) notFound();

  const wrongCountry = shipment.destinationPort.country !== profile.countryCode;
  const suggestedCents = profile.baseFeeUSDCents + profile.docSetFeeUSDCents;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/customs/rfq" className="text-sm text-[var(--brand)] underline">
          <span className="dir-back" /> {tR("backToInbox")}
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          {tR("clearanceAt")}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">
          {shipment.destinationPort.name} ({shipment.destinationPort.unlocode})
        </h1>
        <div className="mt-1 text-xs text-zinc-500">
          {tR("arrivingFrom", {
            origin: shipment.originPort.name,
            unlocode: shipment.originPort.unlocode,
          })}
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <Field label={tS("containerType")}>
            {tS(`container.${containerKey(shipment.containerType)}`)}
          </Field>
          <Field label={tS("weightKg")}>{shipment.weightKg} kg</Field>
          <Field label={tS("readyDate")}>
            {shipment.readyDate.toISOString().slice(0, 10)}
          </Field>
          <Field label={tR("customer")}>
            {shipment.customer.name ?? shipment.customer.email}
          </Field>
          <Field label="INCOTERM">{shipment.incoterm}</Field>
          <Field label={tR("countryMatch")}>
            {wrongCountry ? (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {tR("noCountryMatch")}
              </span>
            ) : (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {profile.countryCode}
              </span>
            )}
          </Field>
        </dl>
      </div>

      <h2 className="mt-10 mb-4 text-base font-medium text-zinc-900">
        {tR("yourQuoteTitle")}
      </h2>

      {existing ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {tR("alreadyQuoted", {
            price: formatUSD(existing.priceUSDCents),
            status: existing.status,
          })}
        </p>
      ) : wrongCountry ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {tR("wrongCountryBlocked", { country: profile.countryCode })}
        </p>
      ) : !profile.onboardingComplete ? (
        <Link
          href="/customs/onboarding"
          className="block rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100"
        >
          {tR("completeOnboardingFirst")}
        </Link>
      ) : (
        <CustomsQuoteForm
          shipmentId={shipment.id}
          locale={locale}
          suggestedUSD={suggestedCents / 100}
        />
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
