import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { UserRowActions } from "./UserRowActions";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string; q?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  const me = await requireRole("ADMIN", locale);
  const t = await getTranslations({ locale, namespace: "Admin" });

  const sp = await searchParams;
  const role =
    sp.role &&
    ["CUSTOMER", "FORWARDER", "COWORKER", "CUSTOMS_AGENT", "ADMIN"].includes(
      sp.role
    )
      ? (sp.role as
          | "CUSTOMER"
          | "FORWARDER"
          | "COWORKER"
          | "CUSTOMS_AGENT"
          | "ADMIN")
      : undefined;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        forwarderProfile: {
          select: { companyName: true, countryCode: true, onboardingComplete: true },
        },
        coworkerProfile: {
          select: {
            displayName: true,
            countryCode: true,
            cityArea: true,
            onboardingComplete: true,
          },
        },
        customsAgentProfile: {
          select: {
            displayName: true,
            countryCode: true,
            licenseNumber: true,
            onboardingComplete: true,
          },
        },
        _count: {
          select: {
            shipments: true,
            quotes: true,
            bookingsAsCust: true,
            bookingsAsFwd: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("usersTitle")}</h1>
        <Link href="/admin" className="text-sm text-[var(--brand)] underline">
          ← {t("backToOverview")}
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="block text-xs uppercase tracking-wide text-zinc-500">
            {t("search")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-xs uppercase tracking-wide text-zinc-500">
            {t("role")}
          </label>
          <select
            id="role"
            name="role"
            defaultValue={role ?? ""}
            className="mt-1 block w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <option value="">{t("anyRole")}</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="FORWARDER">FORWARDER</option>
            <option value="COWORKER">COWORKER</option>
            <option value="CUSTOMS_AGENT">CUSTOMS_AGENT</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {t("apply")}
        </button>
        {(q || role) && (
          <Link href="/admin/users" className="text-sm text-zinc-500 underline">
            {t("clear")}
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-start text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-start">{t("user")}</th>
              <th className="px-4 py-2 text-start">{t("role")}</th>
              <th className="px-4 py-2 text-start">{t("activity")}</th>
              <th className="px-4 py-2 text-start">{t("created")}</th>
              <th className="px-4 py-2 text-start">{t("status")}</th>
              <th className="px-4 py-2 text-end"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">
                    {u.name ?? "—"}
                  </div>
                  <div className="text-xs text-zinc-500">{u.email}</div>
                  {u.forwarderProfile && (
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {u.forwarderProfile.companyName} ({u.forwarderProfile.countryCode})
                      {u.forwarderProfile.onboardingComplete ? (
                        <span className="ms-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          {t("onboarded")}
                        </span>
                      ) : (
                        <span className="ms-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                          {t("notOnboarded")}
                        </span>
                      )}
                    </div>
                  )}
                  {u.coworkerProfile && (
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {u.coworkerProfile.displayName} — {u.coworkerProfile.cityArea} ({u.coworkerProfile.countryCode})
                      {u.coworkerProfile.onboardingComplete ? (
                        <span className="ms-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          {t("onboarded")}
                        </span>
                      ) : (
                        <span className="ms-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                          {t("notOnboarded")}
                        </span>
                      )}
                    </div>
                  )}
                  {u.customsAgentProfile && (
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {u.customsAgentProfile.displayName} ({u.customsAgentProfile.countryCode})
                      {u.customsAgentProfile.licenseNumber
                        ? ` · ${u.customsAgentProfile.licenseNumber}`
                        : ""}
                      {u.customsAgentProfile.onboardingComplete ? (
                        <span className="ms-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          {t("onboarded")}
                        </span>
                      ) : (
                        <span className="ms-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                          {t("notOnboarded")}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-700">{u.role}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {u.role === "CUSTOMER" && (
                    <>
                      {u._count.shipments} {t("shipments")} · {u._count.bookingsAsCust} {t("bookings")}
                    </>
                  )}
                  {u.role === "FORWARDER" && (
                    <>
                      {u._count.quotes} {t("quotes")} · {u._count.bookingsAsFwd} {t("won")}
                    </>
                  )}
                  {u.role === "COWORKER" && "—"}
                  {u.role === "CUSTOMS_AGENT" && "—"}
                  {u.role === "ADMIN" && "—"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  {u.suspended ? (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {t("suspended")}
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {t("active")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs text-[var(--brand)] underline"
                    >
                      Edit
                    </Link>
                    <UserRowActions
                      userId={u.id}
                      locale={locale}
                      suspended={u.suspended}
                      isSelf={u.id === me.id}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                  {t("noUsers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => {
          const qs = new URLSearchParams();
          if (q) qs.set("q", q);
          if (role) qs.set("role", role);
          qs.set("page", String(p));
          return `/admin/users?${qs.toString()}`;
        }}
      />
    </div>
  );
}
