import { setRequestLocale, getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

import { AddLaneForm } from "./AddLaneForm";
import { LaneRow, type LaneRowData } from "./LaneRow";

export default async function LanesPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("FORWARDER", locale);
  const t = await getTranslations({ locale, namespace: "Lanes" });

  const lanesRaw = await db.lane.findMany({
    where: { forwarderId: user.id },
    include: {
      originPort: { select: { name: true, unlocode: true } },
      destinationPort: { select: { name: true, unlocode: true } },
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  const lanes: LaneRowData[] = lanesRaw.map((l) => ({
    id: l.id,
    origin: l.originPort.name,
    originUnlocode: l.originPort.unlocode,
    destination: l.destinationPort.name,
    destinationUnlocode: l.destinationPort.unlocode,
    transitDays: l.transitDays,
    active: l.active,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
        <Link
          href="/forwarder"
          className="text-sm text-[var(--brand)] underline"
        >
          ← {t("backToDashboard")}
        </Link>
      </div>

      <p className="mb-6 text-sm text-zinc-600">{t("intro")}</p>

      <AddLaneForm />

      <div className="mt-10">
        <h2 className="mb-3 text-base font-medium text-zinc-900">
          {t("yourLanes", { count: lanes.length })}
        </h2>
        {lanes.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-start text-xs font-medium uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-start">{t("origin")}</th>
                  <th className="px-4 py-2 text-start">{t("destination")}</th>
                  <th className="px-4 py-2 text-start">{t("transitDays")}</th>
                  <th className="px-4 py-2 text-start">{t("status")}</th>
                  <th className="px-4 py-2 text-start"></th>
                </tr>
              </thead>
              <tbody className="px-4">
                {lanes.map((lane) => (
                  <LaneRow key={lane.id} lane={lane} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
