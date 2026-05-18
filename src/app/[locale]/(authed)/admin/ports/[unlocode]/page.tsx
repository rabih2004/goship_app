import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/guards";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { PortEditForm } from "@/components/PortEditForm";

export default async function AdminEditPortPage({
  params,
}: {
  params: Promise<{ locale: string; unlocode: string }>;
}) {
  const { locale: rawLocale, unlocode } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);
  await requireRole("ADMIN", locale);

  const port = await db.port.findUnique({ where: { unlocode: unlocode.toUpperCase() } });
  if (!port) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link href="/admin/ports" className="text-sm text-brand-600 underline">
          ← Back to ports
        </Link>
      </div>

      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Edit port</h1>
      <p className="mb-8 text-sm text-zinc-500">
        {port.name} · {port.unlocode}
      </p>

      <PortEditForm port={port} locale={locale} backHref={`/${locale}/admin/ports`} />
    </div>
  );
}
