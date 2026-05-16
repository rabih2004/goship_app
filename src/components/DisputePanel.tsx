import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { DisputeForm } from "@/components/DisputeForm";

export async function DisputePanel({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: "en" | "ar";
}) {
  const t = await getTranslations({ locale, namespace: "Dispute" });

  const disputes = await db.dispute.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      description: true,
      status: true,
      adminNote: true,
      createdAt: true,
      resolvedAt: true,
    },
  });

  const hasOpen = disputes.some((d) => d.status === "OPEN");

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-base font-medium text-zinc-900">{t("title")}</h2>

      {disputes.length === 0 && (
        <p className="mb-3 text-xs text-zinc-500">{t("intro")}</p>
      )}

      {disputes.map((d) => {
        const statusClass =
          d.status === "OPEN"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : d.status === "RESOLVED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-zinc-200 bg-zinc-50 text-zinc-700";
        return (
          <div
            key={d.id}
            className={"mb-3 rounded-lg border p-4 text-sm " + statusClass}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{t(`reason.${d.reason}`)}</span>
              <span className="rounded bg-white/60 px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
                {t(`status.${d.status}`)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{d.description}</p>
            <p className="mt-2 text-xs opacity-70">
              {t("openedAt", {
                date: d.createdAt.toISOString().slice(0, 16).replace("T", " "),
              })}
            </p>
            {d.adminNote && (
              <div className="mt-3 rounded bg-white/70 p-2 text-xs">
                <span className="font-medium">{t("adminNoteLabel")}: </span>
                {d.adminNote}
                {d.resolvedAt && (
                  <span className="ml-2 opacity-70">
                    ({d.resolvedAt.toISOString().slice(0, 10)})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!hasOpen && <DisputeForm bookingId={bookingId} locale={locale} />}
    </section>
  );
}
