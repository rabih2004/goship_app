import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/**
 * Public-facing layout for the provider directory. No auth required — these
 * pages exist so a customer can evaluate forwarders / coworkers / customs
 * agents BEFORE signing up.
 *
 * Tabs span the three provider types so users can pivot mid-browse.
 */
export default async function ProvidersLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  const tP = await getTranslations({ locale, namespace: "Providers" });

  return (
    <>
      <Header variant="public" locale={locale} />

      <div className="border-b border-zinc-200 bg-white">
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 text-sm sm:px-6">
          <TabLink href="/providers/forwarders">{tP("tabForwarders")}</TabLink>
          <TabLink href="/providers/coworkers">{tP("tabCoworkers")}</TabLink>
          <TabLink href="/providers/customs">{tP("tabCustoms")}</TabLink>
        </nav>
      </div>

      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </>
  );
}

function TabLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="-mb-px shrink-0 border-b-2 border-transparent px-4 py-3 font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 aria-[current=page]:border-brand-600 aria-[current=page]:text-zinc-900"
    >
      {children}
    </Link>
  );
}
