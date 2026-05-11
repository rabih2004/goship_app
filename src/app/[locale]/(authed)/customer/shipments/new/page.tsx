import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { NewShipmentForm } from "./NewShipmentForm";

export default async function NewShipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  await requireRole("CUSTOMER", locale);
  const t = await getTranslations({ locale, namespace: "Shipments" });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("newTitle")}</h1>
        <Link href="/customer/shipments" className="text-sm text-[var(--brand)] underline">
          ← {t("backToList")}
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-600">{t("newIntro")}</p>
      <NewShipmentForm locale={locale} />
    </div>
  );
}
