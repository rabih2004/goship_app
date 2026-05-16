import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { listNotificationsForUser } from "@/lib/notifications";

import { MarkAllReadForm, MarkAllReadOnMount } from "./MarkReadForms";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as AppLocale;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect({ href: "/sign-in", locale });

  const t = await getTranslations({ locale, namespace: "Notifications" });
  const items = await listNotificationsForUser(session!.user.id, 50);
  const hasUnread = items.some((n) => n.readAt === null);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
        {hasUnread && <MarkAllReadForm locale={locale} />}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const unread = n.readAt === null;
            const wrapperCls = unread
              ? "border-sky-200 bg-sky-50"
              : "border-zinc-200 bg-white";
            const body = (
              <div className="flex items-start gap-3">
                <div
                  className={
                    "mt-1 h-2 w-2 flex-shrink-0 rounded-full " +
                    (unread ? "bg-sky-600" : "bg-transparent")
                  }
                  aria-hidden
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900">
                    {t(`type.${n.type}`)}
                  </div>
                  {n.bodyText && (
                    <div className="mt-0.5 text-sm text-zinc-700">{n.bodyText}</div>
                  )}
                  <div className="mt-1 text-xs text-zinc-500">
                    {n.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </div>
                </div>
              </div>
            );

            if (n.linkPath) {
              return (
                <li key={n.id} className={`rounded-lg border ${wrapperCls}`}>
                  <Link
                    href={n.linkPath}
                    className="block px-4 py-3 transition hover:bg-zinc-50"
                  >
                    {body}
                  </Link>
                </li>
              );
            }
            return (
              <li
                key={n.id}
                className={`rounded-lg border ${wrapperCls} px-4 py-3`}
              >
                {body}
              </li>
            );
          })}
        </ul>
      )}

      <MarkAllReadOnMount locale={locale} />
    </div>
  );
}
