import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { haversineKm, roundKm } from "@/lib/geo";
import {
  isWithinServiceRadius,
  suggestedPickupPriceCents,
} from "@/lib/coworker-pricing";
import { formatUSD } from "@/lib/money";
import { hasActiveSubscription } from "@/lib/subscriptions-actions";

import { PickupQuoteForm } from "./PickupQuoteForm";
import { DirectRequestActions } from "./DirectRequestActions";

export default async function CoworkerRfqDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const tR = await getTranslations({ locale, namespace: "CoworkerRfq" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });
  const tSub = await getTranslations({ locale, namespace: "Subscription" });
  const subscribed = await hasActiveSubscription(user.id);

  const [profile, shipment, existing] = await Promise.all([
    db.coworkerProfile.findUnique({
      where: { userId: user.id },
      select: {
        onboardingComplete: true,
        serviceCenterLat: true,
        serviceCenterLng: true,
        serviceRadiusKm: true,
        baseFeeUSDCents: true,
        perKmRateUSDCents: true,
      },
    }),
    db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        originPort: {
          select: { name: true, unlocode: true, lat: true, lng: true },
        },
        destinationPort: { select: { name: true, unlocode: true } },
      },
    }),
    db.coworkerQuote.findUnique({
      where: {
        shipmentId_coworkerId: { shipmentId: id, coworkerId: user.id },
      },
      select: { id: true, priceUSDCents: true, status: true },
    }),
  ]);

  if (!profile || !shipment) notFound();
  if (shipment.incoterm !== "EXW") notFound();
  if (
    shipment.factoryLat == null ||
    shipment.factoryLng == null ||
    profile.serviceCenterLat == null ||
    profile.serviceCenterLng == null
  )
    notFound();

  const distanceFromYou = roundKm(
    haversineKm(
      profile.serviceCenterLat,
      profile.serviceCenterLng,
      shipment.factoryLat,
      shipment.factoryLng
    )
  );
  const portDistance =
    shipment.originPort.lat != null && shipment.originPort.lng != null
      ? roundKm(
          haversineKm(
            shipment.factoryLat,
            shipment.factoryLng,
            shipment.originPort.lat,
            shipment.originPort.lng
          )
        )
      : 0;
  const inRadius = isWithinServiceRadius({
    distanceKm: distanceFromYou,
    serviceRadiusKm: profile.serviceRadiusKm,
  });

  const suggestedCents = suggestedPickupPriceCents({
    baseFeeUSDCents: profile.baseFeeUSDCents,
    perKmRateUSDCents: profile.perKmRateUSDCents,
    distanceKm: portDistance,
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/coworker/rfq" className="text-sm text-[var(--brand)] underline">
          <span className="dir-back" /> {tR("backToInbox")}
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          {tR("pickupRoute")}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">
          {shipment.factoryCity || shipment.factoryAddressLine}
          <span className="px-2 text-zinc-400 dir-arrow" />
          {shipment.originPort.name} ({shipment.originPort.unlocode})
        </h1>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <Field label={tR("fromYou")}>{distanceFromYou} km</Field>
          <Field label={tR("factoryToPort")}>{portDistance} km</Field>
          <Field label={tR("inRadius")}>
            {inRadius ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {tR("yes")}
              </span>
            ) : (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {tR("no")} ({profile.serviceRadiusKm} km)
              </span>
            )}
          </Field>
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
          <Field label={tR("factoryAddress")}>
            {shipment.factoryAddressLine}
          </Field>
          <Field label={tR("contact")}>
            {shipment.pickupContactName} · {shipment.pickupContactPhone}
          </Field>
        </dl>
      </div>

      {/* Direct request banner + one-click accept/decline */}
      {shipment.preferredCoworkerId === user.id && !existing && (
        <div className="mt-8 rounded-lg border-2 border-[var(--brand)]/50 bg-[var(--brand)]/5 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-medium text-white">
              Direct Request
            </span>
            <p className="text-sm font-medium text-zinc-900">
              The customer has personally chosen you for this pickup.
            </p>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Accept to submit your standard-rate quote instantly, or decline to
            open this job to all coworkers in your country.
          </p>
          <div className="mt-4">
            <DirectRequestActions
              shipmentId={shipment.id}
              locale={locale}
              estimatedCents={suggestedCents}
              portDistanceKm={portDistance}
            />
          </div>
        </div>
      )}

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
      ) : !inRadius ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {tR("outOfRadiusBlocked", { km: distanceFromYou })}
        </p>
      ) : !profile.onboardingComplete ? (
        <Link
          href="/coworker/onboarding"
          className="block rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100"
        >
          {tR("completeOnboardingFirst")}
        </Link>
      ) : !subscribed ? (
        <Link
          href="/coworker/subscription"
          className="block rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 hover:bg-rose-100"
        >
          {tSub("rfqLockedHint")}
        </Link>
      ) : (
        <PickupQuoteForm
          shipmentId={shipment.id}
          locale={locale}
          suggestedUSD={suggestedCents / 100}
          distanceKm={portDistance}
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
