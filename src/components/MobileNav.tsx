"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/Avatar";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { signOutAction } from "@/lib/auth-actions";
import {
  dashboardHrefForRole,
  navLinksForRole,
  profileHrefForRole,
  type NavLink,
} from "@/components/nav-links";

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "ADMIN";

/**
 * Mobile drawer nav. Hamburger button → slide-in panel from inline-end (so it
 * slides from the right in LTR and from the left in RTL).
 *
 * Body scroll is locked while open. Closes on link click + escape.
 */
export function MobileNav({
  name,
  email,
  image,
  role,
  locale,
}: {
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);

  const links: NavLink[] = navLinksForRole(role);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 lg:hidden"
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
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-zinc-900/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 end-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <Link
                href={dashboardHrefForRole(role)}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-3"
              >
                <Avatar name={name || email} image={image} size="md" role={role} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {name || email.split("@")[0]}
                  </div>
                  <div className="truncate text-xs text-zinc-500">{email}</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <Link
                href={dashboardHrefForRole(role)}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                {t("dashboard")}
              </Link>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  {t(l.labelKey)}
                </Link>
              ))}

              <div className="my-3 border-t border-zinc-200" />

              <Link
                href={profileHrefForRole(role)}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                {t("profile")}
              </Link>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                {t("notifications")}
              </Link>
            </nav>

            <div className="border-t border-zinc-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-zinc-500">{t("language")}</span>
                <LocaleSwitch />
              </div>
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  {t("signOut")}
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
