import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function RfqInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;

  setRequestLocale(locale);
  const user = await requireRole("FORWARDER", locale);
  const t = await getTranslations({ locale, namespace: "Rfq" });
  const tS = await getTranslations({ locale, namespace: "Shipments" });

  const lanes = await db.lane.findMany({
    where: { forwarderId: user.id, active: true },
    select: { originPortUnlocode: true, destinationPortUnlocode: true },
  });

  const rfqs =
    lanes.length === 0
      ? []
      : await db.shipment.findMany({
          where: {
            status: "RFQ_OPEN",
            quotes: { none: { forwarderId: user.id } },
            OR: lanes.map((l) => ({
              originPortUnlocode: l.originPortUnlocode,
              destinationPortUnlocode: l.destinationPortUnlocode,
            })),
          },
          include: {
            originPort: { select: { name: true, unlocode: true } },
            destinationPort: { select: { name: true, unlocode: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("inboxTitle")}</h1>
        <Link
          href="/forwarder/lanes"
          className="text-sm text-[var(--brand)] underline"
        >
          {t("manageLanes")} →
        </Link>
      </div>

      {lanes.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          {t("noLanes")}
        </p>
      ) : rfqs.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {t("emptyInbox")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-start">{t("route")}</th>
                <th className="px-4 py-2 text-start">{t("container")}</th>
                <th className="px-4 py-2 text-start">{t("readyDate")}</th>
                <th className="px-4 py-2 text-start">{t("posted")}</th>
                <th className="px-4 py-2 text-start"></th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">
                      {s.originPort.name}
                    </span>
                    <span className="px-1 text-zinc-400 dir-arrow" />
                    <span className="font-medium text-zinc-900">
                      {s.destinationPort.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {tS(`container.${containerKey(s.containerType)}`)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {s.readyDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {ago(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/forwarder/rfq/${s.id}`}
                      className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand-fg)] hover:opacity-90"
                    >
                      {t("submitQuote")}
                    </Link>
                  </td>
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

function ago(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
