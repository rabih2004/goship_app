import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";
import { getActiveSubscriptionForUser } from "@/lib/subscriptions-actions";
import { daysRemaining } from "@/lib/subscriptions";

export default async function CustomsHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("CUSTOMS_AGENT", locale);
  const tC = await getTranslations({ locale, namespace: "Customs" });
  const tO = await getTranslations({ locale, namespace: "Onboarding" });
  const tSub = await getTranslations({ locale, namespace: "Subscription" });
  const sub = await getActiveSubscriptionForUser(user.id);

  const [profile, pendingCount, bookedCount] = await Promise.all([
    db.customsAgentProfile.findUnique({
      where: { userId: user.id },
      select: {
        displayName: true,
        countryCode: true,
        licenseNumber: true,
        baseFeeUSDCents: true,
        docSetFeeUSDCents: true,
        onboardingComplete: true,
      },
    }),
    db.customsQuote.count({
      where: { customsAgentId: user.id, status: "PENDING" },
    }),
    db.booking.count({ where: { customsAgentId: user.id } }),
  ]);

  const inboxCount = profile?.countryCode
    ? await db.shipment.count({
        where: {
          status: "RFQ_OPEN",
          needsCustomsClearance: true,
          destinationPort: { country: profile.countryCode },
          customsQuotes: { none: { customsAgentId: user.id } },
        },
      })
    : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        {profile?.displayName ?? tC("yourProfile")}
      </h1>
      <p className="text-sm text-zinc-500">
        {profile?.countryCode}
        {profile?.licenseNumber ? ` · ${tC("licenseShort")} ${profile.licenseNumber}` : ""}
        {" · "}
        {user.email}
      </p>

      {!profile?.onboardingComplete && (
        <Link
          href="/customs/onboarding"
          className="mt-6 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
        >
          <div>
            <div className="font-medium">{tO("homeCardCta")}</div>
            <div className="text-sm">{tO("homeCardBody")}</div>
          </div>
          <span className="text-xl dir-arrow" />
        </Link>
      )}

      {profile?.onboardingComplete && (
        <Link
          href="/customs/subscription"
          className={
            "mt-6 flex items-center justify-between rounded-lg border p-4 transition " +
            (sub
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300"
              : "border-rose-300 bg-rose-50 text-rose-900 hover:border-rose-400")
          }
        >
          <div>
            <div className="font-medium">
              {sub
                ? `${tSub("activeBadge")} — ${sub.tierName}`
                : tSub("homeCardCta")}
            </div>
            <div className="text-sm">
              {sub
                ? tSub("activeUntil", {
                    date: sub.currentPeriodEnd.toISOString().slice(0, 10),
                    days: daysRemaining(sub.currentPeriodEnd),
                  })
                : tSub("homeCardBody")}
            </div>
          </div>
          <span className="text-xl dir-arrow" />
        </Link>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/customs/rfq"
          className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/5 p-5 transition hover:border-[var(--brand)]"
        >
          <div className="text-2xl font-semibold text-zinc-900">{inboxCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {tC("inboundRfqs")}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {tC("inboxHint", { country: profile?.countryCode ?? "—" })}
          </div>
        </Link>
        <Link
          href="/customs/bookings"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <div className="text-2xl font-semibold text-zinc-900">{bookedCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {tC("wonClearances")}
          </div>
        </Link>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-2xl font-semibold text-zinc-900">{pendingCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
            {tC("pendingQuotes")}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card
          label={tC("baseFee")}
          big={formatUSD(profile?.baseFeeUSDCents ?? 0)}
        />
        <Card
          label={tC("docSetFee")}
          big={formatUSD(profile?.docSetFeeUSDCents ?? 0)}
        />
      </div>
    </div>
  );
}

function Card({ label, big }: { label: string; big: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="text-base font-semibold text-zinc-900">{big}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}
