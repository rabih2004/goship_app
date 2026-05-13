import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect, Link } from "@/i18n/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { UnreadBadge } from "@/components/UnreadBadge";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export default async function AuthedLayout({
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
  if (!session?.user) redirect({ href: "/sign-in", locale });

  const tBrand = await getTranslations({ locale, namespace: "Brand" });

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
            {tBrand("name")}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <UnreadBadge userId={session!.user.id} />
            <span className="hidden text-zinc-600 sm:inline">
              {session!.user.email}
            </span>
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              {session!.user.role}
            </span>
            <SignOutButton locale={locale} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
