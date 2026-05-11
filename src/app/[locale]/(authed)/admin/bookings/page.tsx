import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { formatUSD } from "@/lib/money";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 50;

export default async function AdminBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("ADMIN", locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const tB = await getTranslations({ locale, namespace: "Booking" });

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const [bookings, total, totals] = await Promise.all([
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        shipment: {
          select: {
            originPort: { select: { name: true, unlocode: true } },
            destinationPort: { select: { name: true, unlocode: true } },
            status: true,
          },
        },
        customer: { select: { email: true, name: true } },
        forwarder: {
          select: {
            email: true,
            forwarderProfile: { select: { companyName: true } },
          },
        },
      },
    }),
    db.booking.count(),
    db.booking.aggregate({
      _sum: {
        totalUSDCents: true,
        platformFeeUSDCents: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const grossUSD = totals._sum.totalUSDCents ?? 0;
  const feeUSD = totals._sum.platformFeeUSDCents ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {t("bookingsTitle")}
        </h1>
        <Link href="/admin" className="text-sm text-[var(--brand)] underline">
          ← {t("backToOverview")}
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t("totalBookings")} value={String(total)} />
        <Stat label={t("grossVolume")} value={formatUSD(grossUSD)} />
        <Stat label={t("platformRevenue")} value={formatUSD(feeUSD)} accent />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-start">{tB("bookingNumber")}</th>
              <th className="px-4 py-2 text-start">{t("route")}</th>
              <th className="px-4 py-2 text-start">{tB("customer")}</th>
              <th className="px-4 py-2 text-start">{tB("forwarder")}</th>
              <th className="px-4 py-2 text-start">{tB("amountPaid")}</th>
              <th className="px-4 py-2 text-start">{tB("platformFee")}</th>
              <th className="px-4 py-2 text-start">{t("created")}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-mono text-xs text-zinc-900">
                  {b.bookingNumber}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700">
                  {b.shipment.originPort.name}
                  <span className="px-1 text-zinc-400 dir-arrow" />
                  {b.shipment.destinationPort.name}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700">
                  {b.customer.name ?? b.customer.email}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700">
                  {b.forwarder.forwarderProfile?.companyName ??
                    b.forwarder.email}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-900">
                  {formatUSD(b.totalUSDCents)}
                </td>
                <td className="px-4 py-3 text-xs text-emerald-700">
                  {formatUSD(b.platformFeeUSDCents)}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {b.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                  {t("noBookings")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => `/admin/bookings?page=${p}`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-5 " +
        (accent
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-white")
      }
    >
      <div
        className={
          "text-xs uppercase tracking-wide " +
          (accent ? "text-emerald-700" : "text-zinc-500")
        }
      >
        {label}
      </div>
      <div
        className={
          "mt-1 text-2xl font-semibold " +
          (accent ? "text-emerald-900" : "text-zinc-900")
        }
      >
        {value}
      </div>
    </div>
  );
}
