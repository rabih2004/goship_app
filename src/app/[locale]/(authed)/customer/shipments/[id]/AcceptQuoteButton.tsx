"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { acceptQuoteAction, type AcceptQuoteState } from "./actions";

const initialState: AcceptQuoteState = { ok: false };

export function AcceptQuoteButton({
  shipmentId,
  quoteId,
  locale,
  mockMode,
}: {
  shipmentId: string;
  quoteId: string;
  locale: "en" | "ar";
  mockMode: boolean;
}) {
  const t = useTranslations("Quotes");
  const tB = useTranslations("Booking");
  const [state, action, pending] = useActionState(acceptQuoteAction, initialState);

  const errorMsg =
    state.error === "providerError"
      ? tB("errProvider")
      : state.error === "shipmentNotOpen"
        ? tB("errShipmentNotOpen")
        : state.error === "quoteNotPending"
          ? tB("errQuoteNotPending")
          : state.error
            ? tB("errUnknown")
            : null;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = mockMode ? tB("confirmMock") : tB("confirmReal");
        if (!confirm(msg)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" loading={pending}>
        {t("accept")}
      </Button>
      {errorMsg && (
        <span className="text-xs text-red-600">{errorMsg}</span>
      )}
    </form>
  );
}
