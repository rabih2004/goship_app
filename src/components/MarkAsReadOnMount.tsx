"use client";

import { useEffect, useRef } from "react";

import { markConversationReadAction } from "@/lib/chat";

export function MarkAsReadOnMount({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: "en" | "ar";
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const fd = new FormData();
    fd.append("bookingId", bookingId);
    fd.append("locale", locale);
    void markConversationReadAction(fd);
  }, [bookingId, locale]);

  return null;
}
