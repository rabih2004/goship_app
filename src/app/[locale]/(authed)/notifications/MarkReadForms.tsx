"use client";

import { useEffect, useRef } from "react";

import {
  markAllNotificationsReadAction,
} from "@/lib/notifications-actions";

/**
 * Header button so power users can still mark-all-read manually after
 * navigating away mid-scroll. The auto-mount component below handles the
 * common case (open page → everything marked read).
 */
export function MarkAllReadForm({ locale }: { locale: "en" | "ar" }) {
  return (
    <form action={markAllNotificationsReadAction}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="text-xs text-[var(--brand)] underline hover:opacity-80"
      >
        Mark all read
      </button>
    </form>
  );
}

/**
 * Fires markAllNotificationsReadAction once on page mount — same pattern as
 * ChatPanel's MarkAsReadOnMount. Visiting /notifications is "I've seen them."
 */
export function MarkAllReadOnMount({ locale }: { locale: "en" | "ar" }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const fd = new FormData();
    fd.append("locale", locale);
    void markAllNotificationsReadAction(fd);
  }, [locale]);

  return null;
}
