import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { ResolveDisputeForm } from "./ResolveDisputeForm";

export default async function AdminDisputesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("ADMIN", locale);
  const t = await getTranslations({ locale, namespace: "Dispute" });
  const tA = await getTranslations({ locale, namespace: "Admin" });

  const sp = await searchParams;
  const filterStatus = (sp.status === "RESOLVED" || sp.status === "REJECTED"
    ? sp.status
    : "OPEN") as "OPEN" | "RESOLVED" | "REJECTED";

  const disputes = await db.dispute.findMany({
    where: { status: filterStatus },
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          customer: { select: { email: true, name: true } },
          forwarder: { select: { email: true, name: true } },
        },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("adminTitle")}</h1>
        <Link href="/admin" className="text-sm text-[var(--brand)] underline">
          <span className="dir-back" /> {tA("backToOverview")}
        </Link>
      </div>

      <nav className="mb-6 flex gap-3 text-sm">
        {(["OPEN", "RESOLVED", "REJECTED"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/disputes?status=${s}`}
            className={
              "rounded px-3 py-1.5 " +
              (filterStatus === s
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50")
            }
          >
            {t(`status.${s}`)}
          </Link>
        ))}
      </nav>

      {disputes.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {t("emptyList")}
        </p>
      ) : (
        <ul className="space-y-4">
          {disputes.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm font-semibold text-zinc-900">
                    {d.booking.bookingNumber}
                  </div>
                  <div className="mt-1 text-sm font-medium text-zinc-900">
                    {t(`reason.${d.reason}`)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {t("partiesLine", {
                      customer:
                        d.booking.customer.name ?? d.booking.customer.email,
                      forwarder:
                        d.booking.forwarder.name ?? d.booking.forwarder.email,
                    })}
                  </div>
                </div>
                <span
                  className={
                    "rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide " +
                    (d.status === "OPEN"
                      ? "bg-amber-100 text-amber-800"
                      : d.status === "RESOLVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-zinc-200 text-zinc-700")
                  }
                >
                  {t(`status.${d.status}`)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-800">
                {d.description}
              </p>

              {d.adminNote && (
                <div className="mt-3 rounded bg-zinc-50 p-3 text-xs text-zinc-700">
                  <span className="font-medium">{t("adminNoteLabel")}: </span>
                  {d.adminNote}
                </div>
              )}

              {d.status === "OPEN" && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <ResolveDisputeForm disputeId={d.id} locale={locale} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
