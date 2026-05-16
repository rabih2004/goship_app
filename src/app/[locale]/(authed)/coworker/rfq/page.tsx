import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { haversineKm, roundKm } from "@/lib/geo";
import { isWithinServiceRadius } from "@/lib/coworker-pricing";
import { hasActiveSubscription } from "@/lib/subscriptions-actions";

export default async function CoworkerRfqInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const tR = await getTranslations({ locale, namespace: "CoworkerRfq" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });

  const profile = await db.coworkerProfile.findUnique({
    where: { userId: user.id },
    select: {
      serviceCenterLat: true,
      serviceCenterLng: true,
      serviceRadiusKm: true,
      onboardingComplete: true,
    },
  });
  if (!profile) notFound();

  const onboardingComplete = profile.onboardingComplete;
  const subscribed = await hasActiveSubscription(user.id);
  const tSub = await getTranslations({ locale, namespace: "Subscription" });
  const center =
    profile.serviceCenterLat != null && profile.serviceCenterLng != null
      ? { lat: profile.serviceCenterLat, lng: profile.serviceCenterLng }
      : null;

  // Direct pickup requests: EXW shipments where this coworker was specifically chosen.
  const directRequests = await db.shipment.findMany({
    where: {
      status: "RFQ_OPEN",
      incoterm: "EXW",
      preferredCoworkerId: user.id,
      coworkerQuotes: { none: { coworkerId: user.id } },
    },
    include: {
      customer: { select: { name: true, email: true } },
      originPort: { select: { name: true, unlocode: true, lat: true, lng: true } },
      destinationPort: { select: { name: true, unlocode: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch open ExWorks RFQs in the general queue (no preferred coworker, or preference cleared after decline).
  const candidates = center
    ? await db.shipment.findMany({
        where: {
          status: "RFQ_OPEN",
          incoterm: "EXW",
          factoryLat: { not: null },
          factoryLng: { not: null },
          coworkerQuotes: { none: { coworkerId: user.id } },
          preferredCoworkerId: null,
        },
        include: {
          customer: { select: { name: true, email: true } },
          originPort: { select: { name: true, unlocode: true, lat: true, lng: true } },
          destinationPort: { select: { name: true, unlocode: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Filter to those within the coworker's service radius from factory.
  const inRadius = candidates
    .map((s) => {
      const distanceFromFactoryKm =
        center && s.factoryLat != null && s.factoryLng != null
          ? haversineKm(center.lat, center.lng, s.factoryLat, s.factoryLng)
          : Infinity;
      const portDistanceKm =
        s.factoryLat != null &&
        s.factoryLng != null &&
        s.originPort.lat != null &&
        s.originPort.lng != null
          ? haversineKm(
              s.factoryLat,
              s.factoryLng,
              s.originPort.lat,
              s.originPort.lng
            )
          : 0;
      return {
        shipment: s,
        distanceFromFactoryKm: roundKm(distanceFromFactoryKm),
        portDistanceKm: roundKm(portDistanceKm),
      };
    })
    .filter(({ distanceFromFactoryKm }) =>
      isWithinServiceRadius({
        distanceKm: distanceFromFactoryKm,
        serviceRadiusKm: profile.serviceRadiusKm,
      })
    )
    .sort((a, b) => a.distanceFromFactoryKm - b.distanceFromFactoryKm);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{tR("title")}</h1>
        <Link
          href="/coworker"
          className="text-sm text-[var(--brand)] underline"
        >
          <span className="dir-back" /> {tR("backToDashboard")}
        </Link>
      </div>

      {!onboardingComplete && (
        <Link
          href="/coworker/onboarding"
          className="mb-6 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <span>{tR("completeOnboardingFirst")}</span>
          <span className="dir-arrow" />
        </Link>
      )}

      {onboardingComplete && !subscribed && (
        <Link
          href="/coworker/subscription"
          className="mb-6 flex items-center justify-between rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"
        >
          <span>{tSub("rfqLockedHint")}</span>
          <span className="dir-arrow" />
        </Link>
      )}

      {/* Direct pickup requests — always shown even without a service center */}
      {directRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-zinc-900">
            Direct Pickup Requests
            <span className="ml-2 rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-medium text-white">
              {directRequests.length}
            </span>
          </h2>
          <ul className="space-y-3">
            {directRequests.map((s) => (
              <li key={s.id} className="rounded-lg border-2 border-[var(--brand)]/40 bg-[var(--brand)]/5 p-4 transition hover:border-[var(--brand)]/70">
                <Link
                  href={`/coworker/rfq/${s.id}`}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-medium text-white">
                        Direct Request
                      </span>
                      <span className="font-medium text-zinc-900">
                        {s.factoryCity || s.factoryAddressLine}
                        <span className="px-2 text-zinc-400 dir-arrow" />
                        {s.originPort.name} ({s.originPort.unlocode})
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {tR("forCustomer", {
                        name: s.customer.name ?? s.customer.email,
                      })}
                      {" · "}
                      {tS(`container.${containerKey(s.containerType)}`)}
                      {" · "}
                      {s.weightKg} kg
                    </div>
                  </div>
                  <span className="text-xl text-zinc-300 dir-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!center && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {tR("noServiceCenter")}
        </p>
      )}

      {center && inRadius.length === 0 && (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {tR("emptyInbox", { radius: profile.serviceRadiusKm })}
        </p>
      )}

      {inRadius.length > 0 && (
        <ul className="space-y-3">
          {inRadius.map(({ shipment, distanceFromFactoryKm, portDistanceKm }) => (
            <li
              key={shipment.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400"
            >
              <Link
                href={`/coworker/rfq/${shipment.id}`}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-zinc-900">
                    {shipment.factoryCity || shipment.factoryAddressLine}
                    <span className="px-2 text-zinc-400 dir-arrow" />
                    {shipment.originPort.name} ({shipment.originPort.unlocode})
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {tR("forCustomer", {
                      name: shipment.customer.name ?? shipment.customer.email,
                    })}
                    {" · "}
                    {tS(`container.${containerKey(shipment.containerType)}`)}
                    {" · "}
                    {shipment.weightKg} kg
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-end">
                    <div className="text-zinc-900">
                      {tR("fromYouKm", { km: distanceFromFactoryKm })}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {tR("toPortKm", { km: portDistanceKm })}
                    </div>
                  </div>
                  <span className="text-xl text-zinc-300 dir-arrow" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function containerKey(c: string): "twentyFt" | "fortyFt" | "fortyHC" | "lcl" {
  if (c === "TWENTY_FT") return "twentyFt";
  if (c === "FORTY_HC") return "fortyHC";
  if (c === "LCL") return "lcl";
  return "fortyFt";
}
