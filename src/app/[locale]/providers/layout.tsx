import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

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

  const session = await auth();
  const tBrand = await getTranslations({ locale, namespace: "Brand" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tP = await getTranslations({ locale, namespace: "Providers" });

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            {tBrand("name")}
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-fg)] hover:opacity-90"
              >
                {tNav("dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-md px-4 py-2 font-medium text-zinc-700 hover:text-zinc-900"
                >
                  {tNav("signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-fg)] hover:opacity-90"
                >
                  {tNav("signUp")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="border-b border-zinc-200 bg-white">
        <nav className="mx-auto flex max-w-6xl gap-1 px-6 text-sm">
          <TabLink href="/providers/forwarders">{tP("tabForwarders")}</TabLink>
          <TabLink href="/providers/coworkers">{tP("tabCoworkers")}</TabLink>
          <TabLink href="/providers/customs">{tP("tabCustoms")}</TabLink>
        </nav>
      </div>

      <main className="flex-1">{children}</main>
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
      className="-mb-px border-b-2 border-transparent px-4 py-3 font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 aria-[current=page]:border-[var(--brand)] aria-[current=page]:text-zinc-900"
    >
      {children}
    </Link>
  );
}
