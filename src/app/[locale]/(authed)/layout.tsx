import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect, Link } from "@/i18n/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { UnreadBadge } from "@/components/UnreadBadge";
import { NotificationBell } from "@/components/NotificationBell";
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
            <NotificationBell userId={session!.user.id} locale={locale} />
            <UnreadBadge userId={session!.user.id} />
            <span className="hidden text-zinc-600 sm:inline">
              {session!.user.email}
            </span>
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              {session!.user.role}
            </span>
            <Link
              href="/settings"
              title="Settings"
              aria-label="Settings"
              className="text-zinc-500 hover:text-zinc-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
            <SignOutButton locale={locale} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
