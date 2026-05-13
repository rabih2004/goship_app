"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError } from "@/components/ui/FormError";

import {
  submitReviewAction,
  type SubmitReviewState,
} from "@/lib/reviews-actions";

const initial: SubmitReviewState = { ok: false };

export function ReviewForm({
  bookingId,
  ratedUserId,
  ratedRole,
  ratedName,
  locale,
}: {
  bookingId: string;
  ratedUserId: string;
  ratedRole: "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT" | "CUSTOMER";
  ratedName: string;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Reviews");
  const [state, action, pending] = useActionState(submitReviewAction, initial);
  const [score, setScore] = useState<number>(5);

  const errMsg =
    state.error === "notDelivered"
      ? t("errNotDelivered")
      : state.error === "duplicate"
        ? t("errDuplicate")
        : state.error === "wrongCounterparty"
          ? t("errWrongCounterparty")
          : state.error === "notAParty"
            ? t("errNotAParty")
            : state.error
              ? t("errUnknown")
              : null;

  if (state.ok) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {t("thanks", { name: ratedName })}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="ratedUserId" value={ratedUserId} />
      <input type="hidden" name="ratedRole" value={ratedRole} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="score" value={score} />

      <div>
        <Label>{t("scoreLabel", { name: ratedName })}</Label>
        <div className="mt-1 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScore(s)}
              aria-label={t("scoreNStars", { n: s })}
              className={
                "text-2xl transition " +
                (s <= score ? "text-amber-500" : "text-zinc-300 hover:text-amber-300")
              }
            >
              ★
            </button>
          ))}
          <span className="ms-2 text-xs text-zinc-500">{score}/5</span>
        </div>
      </div>

      <div>
        <Label htmlFor={`comment-${ratedUserId}`}>{t("commentLabel")}</Label>
        <textarea
          id={`comment-${ratedUserId}`}
          name="comment"
          rows={2}
          maxLength={2000}
          placeholder={t("commentPlaceholder")}
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      </div>

      {errMsg && <FormError>{errMsg}</FormError>}

      <div className="flex items-center justify-end">
        <Button type="submit" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
