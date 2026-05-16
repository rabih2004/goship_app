import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { SUPPORTED_CURRENCIES } from "@/lib/fx";

import { CurrencySelectForm } from "./CurrencySelectForm";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect({ href: "/sign-in", locale });

  const t = await getTranslations({ locale, namespace: "Settings" });

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { email: true, name: true, preferredCurrency: true },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        {t("title")}
      </h1>
      <p className="mb-8 text-sm text-zinc-500">{user?.email}</p>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-medium text-zinc-900">
          {t("currencyTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("currencyBody")}</p>
        <div className="mt-4">
          <CurrencySelectForm
            locale={locale}
            current={user?.preferredCurrency ?? "USD"}
            options={[...SUPPORTED_CURRENCIES]}
          />
        </div>
      </div>

      <p className="mt-8 text-sm">
        <Link
          href="/dashboard"
          className="text-[var(--brand)] underline"
        >
          <span className="dir-back" /> {t("backToDashboard")}
        </Link>
      </p>
    </div>
  );
}
