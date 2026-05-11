import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function ShipmentsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("CUSTOMER", locale);
  const t = await getTranslations({ locale, namespace: "Shipments" });

  const shipments = await db.shipment.findMany({
    where: { customerId: user.id },
    include: {
      originPort: { select: { name: true, unlocode: true } },
      destinationPort: { select: { name: true, unlocode: true } },
      _count: { select: { quotes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("listTitle")}</h1>
        <Link
          href="/customer/shipments/new"
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] hover:opacity-90"
        >
          + {t("newShipment")}
        </Link>
      </div>

      {shipments.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {t("emptyList")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-start">{t("route")}</th>
                <th className="px-4 py-2 text-start">{t("containerShort")}</th>
                <th className="px-4 py-2 text-start">{t("readyDate")}</th>
                <th className="px-4 py-2 text-start">{t("status")}</th>
                <th className="px-4 py-2 text-start">{t("quotes")}</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customer/shipments/${s.id}`}
                      className="block"
                    >
                      <span className="font-medium text-zinc-900">
                        {s.originPort.name}
                      </span>
                      <span className="px-1 text-zinc-400 dir-arrow" />
                      <span className="font-medium text-zinc-900">
                        {s.destinationPort.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {t(`container.${containerKey(s.containerType)}`)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {s.readyDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} t={t} />
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{s._count.quotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function containerKey(c: string): "twentyFt" | "fortyFt" | "fortyHC" | "lcl" {
  if (c === "TWENTY_FT") return "twentyFt";
  if (c === "FORTY_HC") return "fortyHC";
  if (c === "LCL") return "lcl";
  return "fortyFt";
}

type TranslateFn = (key: string) => string;

function StatusBadge({ status, t }: { status: string; t: TranslateFn }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700",
    RFQ_OPEN: "bg-amber-100 text-amber-800",
    BOOKED: "bg-sky-100 text-sky-800",
    IN_TRANSIT: "bg-indigo-100 text-indigo-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-zinc-200 text-zinc-700",
  };
  const cls = styles[status] ?? styles.DRAFT;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {t(`statusLabels.${status}`)}
    </span>
  );
}
