"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

import { advanceStageAction, type AdvanceState } from "./actions";

const initial: AdvanceState = { ok: false };

export function AdvanceStageForm({
  bookingId,
  locale,
  nextStageLabel,
  disabled,
}: {
  bookingId: string;
  locale: "en" | "ar";
  nextStageLabel: string | null;
  disabled: boolean;
}) {
  const t = useTranslations("Tracking");
  const [state, action, pending] = useActionState(advanceStageAction, initial);

  if (disabled || !nextStageLabel) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {t("delivered")}
      </p>
    );
  }

  const errMsg =
    state.error === "alreadyDelivered"
      ? t("alreadyDelivered")
      : state.error
        ? t("errUnknown")
        : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="locale" value={locale} />

      <label className="text-sm">
        <span className="block font-medium text-zinc-800">
          {t("notesLabel")}
        </span>
        <textarea
          name="notes"
          rows={2}
          maxLength={500}
          placeholder={t("notesPlaceholder")}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      </label>

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600">
          {t("nextStageHint", { stage: nextStageLabel })}
        </span>
        <Button type="submit" loading={pending}>
          {t("advanceBtn", { stage: nextStageLabel })}
        </Button>
      </div>

      {errMsg && <FormError>{errMsg}</FormError>}
    </form>
  );
}
