import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("ADMIN", locale);
  const t = await getTranslations({ locale, namespace: "Admin" });

  const [
    users,
    forwarders,
    onboardedForwarders,
    coworkers,
    customers,
    shipments,
    openShipments,
    bookings,
    suspended,
    revenue,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "FORWARDER" } }),
    db.forwarderProfile.count({ where: { onboardingComplete: true } }),
    db.user.count({ where: { role: "COWORKER" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.shipment.count(),
    db.shipment.count({ where: { status: "RFQ_OPEN" } }),
    db.booking.count(),
    db.user.count({ where: { suspended: true } }),
    db.booking.aggregate({
      _sum: { totalUSDCents: true, platformFeeUSDCents: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">{t("overviewTitle")}</h1>
      <p className="mb-8 text-sm text-zinc-500">{t("overviewSubtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href="/admin/users"
          big={String(users)}
          label={t("usersCard")}
          sub={`${customers} ${t("customers")} · ${forwarders} ${t("forwarders")} · ${coworkers} ${t("coworkers")}${suspended ? ` · ${suspended} ${t("suspended")}` : ""}`}
        />
        <NavCard
          href="/admin/shipments"
          big={String(shipments)}
          label={t("shipmentsCard")}
          sub={`${openShipments} ${t("rfqsOpen")}`}
        />
        <NavCard
          href="/admin/bookings"
          big={String(bookings)}
          label={t("bookingsCard")}
          sub={`${formatUSD(revenue._sum.totalUSDCents ?? 0)} ${t("gross")}`}
        />
        <NavCard
          href="/admin/bookings"
          big={formatUSD(revenue._sum.platformFeeUSDCents ?? 0)}
          label={t("revenueCard")}
          sub={`${onboardedForwarders} / ${forwarders} ${t("onboarded")}`}
          accent
        />
      </div>

      <h2 className="mt-10 mb-3 text-base font-medium text-zinc-900">
        {t("quickLinks")}
      </h2>
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/admin/users?role=FORWARDER" className="text-[var(--brand)] underline">
              → {t("linkAllForwarders")}
            </Link>
          </li>
          <li>
            <Link href="/admin/shipments?status=RFQ_OPEN" className="text-[var(--brand)] underline">
              → {t("linkOpenRfqs")}
            </Link>
          </li>
          <li>
            <Link href="/admin/users?role=ADMIN" className="text-[var(--brand)] underline">
              → {t("linkAdmins")}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

function NavCard({
  href,
  big,
  label,
  sub,
  accent,
}: {
  href: string;
  big: string;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  const cls = accent
    ? "border-emerald-200 bg-emerald-50 hover:border-emerald-400"
    : "border-zinc-200 bg-white hover:border-zinc-400";
  const bigCls = accent ? "text-emerald-900" : "text-zinc-900";
  const labelCls = accent ? "text-emerald-700" : "text-zinc-500";
  return (
    <Link
      href={href}
      className={`rounded-lg border p-5 transition ${cls}`}
    >
      <div className={`text-2xl font-semibold ${bigCls}`}>{big}</div>
      <div className={`mt-1 text-xs uppercase tracking-wide ${labelCls}`}>
        {label}
      </div>
      {sub && <div className="mt-2 text-xs text-zinc-600">{sub}</div>}
    </Link>
  );
}
