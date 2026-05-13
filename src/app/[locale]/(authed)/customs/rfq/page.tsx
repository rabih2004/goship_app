import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function CustomsRfqInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("CUSTOMS_AGENT", locale);
  const tR = await getTranslations({ locale, namespace: "CustomsRfq" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });

  const profile = await db.customsAgentProfile.findUnique({
    where: { userId: user.id },
    select: { countryCode: true, onboardingComplete: true },
  });
  if (!profile) notFound();

  const shipments = await db.shipment.findMany({
    where: {
      status: "RFQ_OPEN",
      needsCustomsClearance: true,
      destinationPort: { country: profile.countryCode },
      customsQuotes: { none: { customsAgentId: user.id } },
    },
    include: {
      customer: { select: { name: true, email: true } },
      originPort: { select: { name: true, unlocode: true } },
      destinationPort: { select: { name: true, unlocode: true, country: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{tR("title")}</h1>
        <Link href="/customs" className="text-sm text-[var(--brand)] underline">
          <span className="dir-back" /> {tR("backToDashboard")}
        </Link>
      </div>

      {!profile.onboardingComplete && (
        <Link
          href="/customs/onboarding"
          className="mb-6 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <span>{tR("completeOnboardingFirst")}</span>
          <span className="dir-arrow" />
        </Link>
      )}

      {shipments.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {tR("emptyInbox", { country: profile.countryCode })}
        </p>
      ) : (
        <ul className="space-y-3">
          {shipments.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400"
            >
              <Link
                href={`/customs/rfq/${s.id}`}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-zinc-900">
                    {s.originPort.name}
                    <span className="px-2 text-zinc-400 dir-arrow" />
                    {s.destinationPort.name} ({s.destinationPort.unlocode})
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {tR("forCustomer", {
                      name: s.customer.name ?? s.customer.email,
                    })}
                    {" · "}
                    {tS(`container.${containerKey(s.containerType)}`)}
                    {" · "}
                    {s.weightKg} kg
                    {" · "}
                    INCOTERM {s.incoterm}
                  </div>
                </div>
                <span className="text-xl text-zinc-300 dir-arrow" />
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
