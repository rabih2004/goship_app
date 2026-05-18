import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { PortCreateForm } from "@/components/PortCreateForm";
import { PortDeleteButton } from "@/components/PortDeleteButton";

export default async function ForwarderPortsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("FORWARDER", locale);

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const perPage = 30;

  const where = q
    ? {
        OR: [
          { unlocode: { contains: q.toUpperCase() } },
          { name: { contains: q } },
          { country: { contains: q.toUpperCase() } },
        ],
      }
    : {};

  const [ports, total] = await Promise.all([
    db.port.findMany({
      where,
      orderBy: [{ country: "asc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: { select: { lanesAsOrigin: true, lanesAsDestination: true, shipmentsAsOrigin: true, shipmentsAsDestination: true } },
      },
    }),
    db.port.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Ports</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} port{total !== 1 ? "s" : ""} in database</p>
        </div>
        <Link href="/forwarder" className="text-sm text-brand-600 underline">
          ← Dashboard
        </Link>
      </div>

      <PortCreateForm locale={locale} />

      {/* Search */}
      <form method="get" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search UNLOCODE, name, or country…"
          className="block w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Search
        </button>
        {q && (
          <Link
            href="/forwarder/ports"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-start">UNLOCODE</th>
              <th className="px-4 py-2 text-start">Name</th>
              <th className="px-4 py-2 text-start">Country</th>
              <th className="px-4 py-2 text-start">Lat / Lng</th>
              <th className="px-4 py-2 text-start">Used by</th>
              <th className="px-4 py-2 text-start"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No ports found.
                </td>
              </tr>
            )}
            {ports.map((port) => {
              const usageCount =
                port._count.lanesAsOrigin +
                port._count.lanesAsDestination +
                port._count.shipmentsAsOrigin +
                port._count.shipmentsAsDestination;
              return (
                <tr key={port.unlocode} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-zinc-900">
                    {port.unlocode}
                  </td>
                  <td className="px-4 py-2 text-zinc-900">{port.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{port.country}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">
                    {port.lat != null && port.lng != null
                      ? `${port.lat.toFixed(3)}, ${port.lng.toFixed(3)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {usageCount > 0 ? (
                      <span className="text-xs text-zinc-500">{usageCount} ref{usageCount !== 1 ? "s" : ""}</span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/forwarder/ports/${port.unlocode}`}
                        className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                      >
                        Edit
                      </Link>
                      {usageCount === 0 && (
                        <PortDeleteButton
                          unlocode={port.unlocode}
                          name={port.name}
                          locale={locale}
                          backHref={`/${locale}/forwarder/ports${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/forwarder/ports?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page - 1}`}
                className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/forwarder/ports?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page + 1}`}
                className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
