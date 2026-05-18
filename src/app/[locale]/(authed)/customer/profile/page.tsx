import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { SUPPORTED_CURRENCIES } from "@/lib/fx";

import { AvatarUpload } from "@/components/AvatarUpload";
import { AccountForm } from "@/components/AccountForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { avatarUrl } from "@/lib/avatars";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Header" });

  const user = await requireRole("CUSTOMER", locale);
  const data = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, image: true, phone: true, preferredCurrency: true },
  });
  const resolvedImage = await avatarUrl(data?.image ?? null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-6">
        <Link href="/customer" className="text-sm text-brand-600 underline">
          ← {t("dashboard")}
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Profile & settings</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Manage your personal info, contact details, password, and display preferences.
      </p>

      <Card className="mb-6">
        <CardHeader title="Profile photo" />
        <AvatarUpload
          name={data?.name ?? data?.email ?? user.email ?? ""}
          currentImage={resolvedImage}
          role="CUSTOMER"
          locale={locale}
        />
      </Card>

      <AccountForm
        name={data?.name ?? ""}
        email={data?.email ?? user.email}
        phone={data?.phone}
        preferredCurrency={data?.preferredCurrency ?? "USD"}
        currencies={SUPPORTED_CURRENCIES}
        locale={locale}
      />
    </div>
  );
}
