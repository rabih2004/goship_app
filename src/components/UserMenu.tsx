"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/Avatar";
import { signOutAction } from "@/lib/auth-actions";
import { profileHrefForRole } from "@/components/nav-links";

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "ADMIN";

/**
 * Avatar-anchored dropdown menu (desktop). Replaces the old cluster of
 * email + role chip + settings cog + sign-out button.
 */
export function UserMenu({
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
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        <Avatar name={name || email} image={image} size="md" role={role} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-64 origin-top-end rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-50"
        >
          <div className="px-3 py-2.5 border-b border-zinc-100">
            <div className="truncate text-sm font-medium text-zinc-900">
              {name || email.split("@")[0]}
            </div>
            <div className="truncate text-xs text-zinc-500">{email}</div>
            <div className="mt-2 inline-flex rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              {role}
            </div>
          </div>

          <Link
            href={profileHrefForRole(role)}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            role="menuitem"
          >
            {t("profile")}
          </Link>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            role="menuitem"
          >
            {t("notifications")}
          </Link>

          <form action={signOutAction} className="mt-1 border-t border-zinc-100 pt-1">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-start text-sm text-red-700 hover:bg-red-50"
              role="menuitem"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
