import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { SUPPORTED_CURRENCIES } from "@/lib/fx";

import { AvatarUpload } from "@/components/AvatarUpload";
import { AccountForm } from "@/components/AccountForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { avatarUrl } from "@/lib/avatars";

import { ProfileForm } from "./ProfileForm";

export default async function ForwarderProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  const user = await requireRole("FORWARDER", locale);

  const [profile, account] = await Promise.all([
    db.forwarderProfile.findUnique({
      where: { userId: user.id },
      select: {
        companyName: true,
        registrationNumber: true,
        countryCode: true,
        logoUrl: true,
        onboardingComplete: true,
      },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, preferredCurrency: true },
    }),
  ]);
  if (!profile) redirect(`/${locale}/forwarder/onboarding`);

  const resolvedLogo = await avatarUrl(profile.logoUrl ?? null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/forwarder" className="text-sm text-brand-600 underline">
          ← Back to dashboard
        </Link>
        {profile.onboardingComplete && (
          <Link
            href="/forwarder/onboarding"
            className="text-sm text-zinc-500 underline hover:text-zinc-700"
          >
            Payment setup
          </Link>
        )}
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Profile & settings</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Manage your company details, personal info, password, and display preferences.
      </p>

      <Card className="mb-6">
        <CardHeader title="Company logo" subtitle="Shown to customers on quote-comparison cards and your public profile." />
        <AvatarUpload
          name={profile.companyName}
          currentImage={resolvedLogo}
          role="FORWARDER"
          locale={locale}
        />
      </Card>

      <Card className="mb-6">
        <ProfileForm locale={locale} profile={profile} />
      </Card>

      <AccountForm
        name={account?.name ?? ""}
        email={account?.email ?? user.email}
        phone={account?.phone}
        preferredCurrency={account?.preferredCurrency ?? "USD"}
        currencies={SUPPORTED_CURRENCIES}
        locale={locale}
      />
    </div>
  );
}
