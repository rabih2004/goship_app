"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";

import {
  submitCoworkerQuoteAction,
  type SubmitCoworkerQuoteState,
} from "./actions";

const initialState: SubmitCoworkerQuoteState = { ok: false };

export function PickupQuoteForm({
  shipmentId,
  locale,
  suggestedUSD,
  distanceKm,
}: {
  shipmentId: string;
  locale: "en" | "ar";
  suggestedUSD: number;
  distanceKm: number;
}) {
  const t = useTranslations("CoworkerRfq");
  const [state, action, pending] = useActionState(
    submitCoworkerQuoteAction,
    initialState
  );

  const fe = state.fieldErrors ?? {};
  const errMsg =
    state.error === "onboarding"
      ? t("errOnboarding")
      : state.error === "subscription"
        ? t("errSubscription")
        : state.error === "outOfRadius"
          ? t("errOutOfRadius")
          : state.error === "duplicate"
            ? t("errDuplicate")
            : state.error === "shipmentNotOpen"
              ? t("errShipmentNotOpen")
              : state.error
                ? t("errUnknown")
                : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="locale" value={locale} />

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
        {t("suggestionLine", {
          km: distanceKm,
          price: suggestedUSD.toFixed(2),
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="priceUSD">{t("priceUSD")}</Label>
          <Input
            id="priceUSD"
            name="priceUSD"
            type="number"
            min={1}
            max={50000}
            step="0.01"
            defaultValue={suggestedUSD.toFixed(2)}
            required
            invalid={!!fe.priceUSD}
          />
          <FieldError>{fe.priceUSD}</FieldError>
        </div>
        <div>
          <Label htmlFor="pickupTime">{t("pickupTime")}</Label>
          <Input
            id="pickupTime"
            name="pickupTime"
            type="datetime-local"
            invalid={!!fe.pickupTime}
          />
          <FieldError>{fe.pickupTime}</FieldError>
        </div>
        <div>
          <Label htmlFor="validDays">{t("validDays")}</Label>
          <Input
            id="validDays"
            name="validDays"
            type="number"
            min={1}
            max={60}
            defaultValue={7}
            required
            invalid={!!fe.validDays}
          />
          <FieldError>{fe.validDays}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="vehicleNote">{t("vehicleNote")}</Label>
        <Input
          id="vehicleNote"
          name="vehicleNote"
          maxLength={120}
          placeholder={t("vehicleNotePlaceholder")}
          invalid={!!fe.vehicleNote}
        />
        <FieldError>{fe.vehicleNote}</FieldError>
      </div>

      <div>
        <Label htmlFor="notes">{t("notes")}</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={1000}
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          placeholder={t("notesPlaceholder")}
        />
      </div>

      {errMsg && <FormError>{errMsg}</FormError>}

      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {t("submit")}
      </Button>
    </form>
  );
}
