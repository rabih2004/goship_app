"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";

import { openDisputeAction, type OpenDisputeState } from "@/lib/disputes";

const REASONS = [
  "DAMAGED_CARGO",
  "LATE_DELIVERY",
  "WRONG_CARGO",
  "DOCUMENTATION",
  "BILLING",
  "OTHER",
] as const;

const initial: OpenDisputeState = { ok: false };

export function DisputeForm({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Dispute");
  const [state, action, pending] = useActionState(openDisputeAction, initial);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};

  const err =
    state.error === "auth"
      ? t("errAuth")
      : state.error === "notAParty"
        ? t("errNotAParty")
        : state.error === "alreadyOpen"
          ? t("errAlreadyOpen")
          : state.error === "bookingNotFound"
            ? t("errBookingNotFound")
            : state.error === "validation"
              ? t("errValidation")
              : state.error
                ? t("errUnknown")
                : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900 hover:bg-rose-100"
      >
        {t("openCta")}
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="reason">{t("reasonLabel")}</Label>
        <select
          id="reason"
          name="reason"
          required
          defaultValue="DAMAGED_CARGO"
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reason.${r}`)}
            </option>
          ))}
        </select>
        <FieldError>{fe.reason}</FieldError>
      </div>

      <div>
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          minLength={10}
          maxLength={4000}
          required
          placeholder={t("descriptionPlaceholder")}
          className="block w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <FieldError>{fe.description}</FieldError>
      </div>

      {err && <FormError>{err}</FormError>}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {t("submit")}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-600 underline"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
