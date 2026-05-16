import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getUnreadNotificationCount } from "@/lib/notifications";

export async function NotificationBell({
  userId,
  locale,
}: {
  userId: string;
  locale: "en" | "ar";
}) {
  const t = await getTranslations({ locale, namespace: "Notifications" });
  const count = await getUnreadNotificationCount(userId);

  return (
    <Link
      href="/notifications"
      title={t("title")}
      aria-label={t("title")}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
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
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-600 px-1 py-px text-[10px] font-semibold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
