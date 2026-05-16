import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { TIERS, daysRemaining } from "@/lib/subscriptions";
import { getActiveSubscriptionForUser } from "@/lib/subscriptions-actions";
import {
  SubscribePanel,
  CancelSubscriptionForm,
} from "@/components/SubscriptionPanel";

export default async function CoworkerSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const user = await requireRole("COWORKER", locale);
  const t = await getTranslations({ locale, namespace: "Subscription" });
  const tier = TIERS.COWORKER;

  const sub = await getActiveSubscriptionForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link
          href="/coworker"
          className="text-sm text-[var(--brand)] underline"
        >
          <span className="dir-back" /> {t("backToDashboard")}
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-zinc-600">{t("introCoworker")}</p>

      {sub ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <div className="text-base font-semibold">
            {t("activeBadge")} — {sub.tierName}
          </div>
          <div className="mt-1">
            {t("activeUntil", {
              date: sub.currentPeriodEnd.toISOString().slice(0, 10),
              days: daysRemaining(sub.currentPeriodEnd),
            })}
          </div>
          <div className="mt-3">
            <CancelSubscriptionForm locale={locale} />
          </div>
        </div>
      ) : (
        <SubscribePanel
          locale={locale}
          priceUSDCents={tier.priceUSDCents}
          tierName={tier.name}
        />
      )}
    </div>
  );
}
