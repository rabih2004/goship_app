import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 50;
const STATUSES = [
  "DRAFT",
  "RFQ_OPEN",
  "BOOKED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export default async function AdminShipmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("ADMIN", locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });

  const sp = await searchParams;
  const status =
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as (typeof STATUSES)[number])
      : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where = status ? { status } : {};

  const [shipments, total] = await Promise.all([
    db.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        originPort: { select: { name: true, unlocode: true } },
        destinationPort: { select: { name: true, unlocode: true } },
        customer: { select: { email: true, name: true } },
        _count: { select: { quotes: true } },
      },
    }),
    db.shipment.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {t("shipmentsTitle")}
        </h1>
        <Link href="/admin" className="text-sm text-[var(--brand)] underline">
          ← {t("backToOverview")}
        </Link>
      </div>

      <form className="mb-6 flex items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <label htmlFor="status" className="block text-xs uppercase tracking-wide text-zinc-500">
            {tS("status")}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 block w-44 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <option value="">{t("anyStatus")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {t("apply")}
        </button>
        {status && (
          <Link href="/admin/shipments" className="text-sm text-zinc-500 underline">
            {t("clear")}
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-start">{t("route")}</th>
              <th className="px-4 py-2 text-start">{t("customer")}</th>
              <th className="px-4 py-2 text-start">{tS("containerShort")}</th>
              <th className="px-4 py-2 text-start">{t("quotes")}</th>
              <th className="px-4 py-2 text-start">{tS("status")}</th>
              <th className="px-4 py-2 text-start">{t("created")}</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <div className="text-zinc-900">
                    {s.originPort.name}
                    <span className="px-1 text-zinc-400 dir-arrow" />
                    {s.destinationPort.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {s.originPort.unlocode}
                    <span className="px-1 dir-arrow" />
                    {s.destinationPort.unlocode}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700">
                  {s.customer.name ?? s.customer.email}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-700">
                  {s.containerType}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-700">{s._count.quotes}</td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-700">{s.status}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {s.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                  {t("noShipments")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) =>
          `/admin/shipments?${status ? `status=${status}&` : ""}page=${p}`
        }
      />
    </div>
  );
}
