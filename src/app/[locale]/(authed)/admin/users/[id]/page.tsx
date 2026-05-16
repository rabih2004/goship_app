import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import {
  AccountForm,
  ForwarderProfileForm,
  CoworkerProfileForm,
  CustomsProfileForm,
} from "./AdminEditForms";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("ADMIN", locale);

  const user = await db.user.findUnique({
    where: { id },
    include: {
      forwarderProfile: {
        select: {
          companyName: true,
          registrationNumber: true,
          countryCode: true,
          onboardingComplete: true,
        },
      },
      coworkerProfile: {
        select: {
          displayName: true,
          countryCode: true,
          cityArea: true,
          serviceRadiusKm: true,
          baseFeeUSDCents: true,
          perKmRateUSDCents: true,
          vehicleType: true,
          vehicleCapacityKg: true,
          onboardingComplete: true,
        },
      },
      customsAgentProfile: {
        select: {
          displayName: true,
          countryCode: true,
          operationCities: true,
          licenseNumber: true,
          baseFeeUSDCents: true,
          docSetFeeUSDCents: true,
          onboardingComplete: true,
        },
      },
    },
  });
  if (!user) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/admin/users" className="text-sm text-[var(--brand)] underline">
          ← Back to users
        </Link>
        <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-mono font-medium text-zinc-600">
          {user.role}
        </span>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        {user.name ?? user.email}
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        {user.email}
        {" · "}
        Joined {user.createdAt.toISOString().slice(0, 10)}
        {" · "}
        <span className={user.suspended ? "text-red-600 font-medium" : "text-emerald-700 font-medium"}>
          {user.suspended ? "Suspended" : "Active"}
        </span>
      </p>

      {/* Account section */}
      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Account</h2>
        <AccountForm
          userId={user.id}
          locale={locale}
          name={user.name}
          suspended={user.suspended}
        />
      </section>

      {/* Role-specific profile section */}
      {user.forwarderProfile && (
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Forwarder profile</h2>
          <ForwarderProfileForm
            userId={user.id}
            locale={locale}
            profile={user.forwarderProfile}
          />
        </section>
      )}

      {user.coworkerProfile && (
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Coworker profile</h2>
          <CoworkerProfileForm
            userId={user.id}
            locale={locale}
            profile={user.coworkerProfile}
          />
        </section>
      )}

      {user.customsAgentProfile && (
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Customs agent profile</h2>
          <CustomsProfileForm
            userId={user.id}
            locale={locale}
            profile={user.customsAgentProfile}
          />
        </section>
      )}

      {user.role === "CUSTOMER" && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          Customers don&apos;t have a separate profile record — account fields above are the full record.
        </p>
      )}
    </div>
  );
}
