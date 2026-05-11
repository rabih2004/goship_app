"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";

import { submitQuoteAction, type SubmitQuoteState } from "./actions";

const initialState: SubmitQuoteState = { ok: false };

export function QuoteForm({
  shipmentId,
  locale,
}: {
  shipmentId: string;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Quotes");
  const [state, action, pending] = useActionState(submitQuoteAction, initialState);
  const fe = state.fieldErrors ?? {};

  const errMessage =
    state.error === "auth"
      ? t("errAuth")
      : state.error === "shipmentNotFound"
        ? t("errShipmentNotFound")
        : state.error === "duplicate"
          ? t("errDuplicate")
          : state.error === "noLane"
            ? t("errNoLane")
            : state.error === "stripeIncomplete"
              ? t("errStripeIncomplete")
              : state.error === "unknown"
                ? t("errUnknown")
                : null;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="priceUSD">{t("priceUSD")}</Label>
          <Input
            id="priceUSD"
            name="priceUSD"
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="3200"
            invalid={!!fe.priceUSD}
          />
          <FieldError>{fe.priceUSD}</FieldError>
        </div>
        <div>
          <Label htmlFor="transitDays">{t("transitDays_label")}</Label>
          <Input
            id="transitDays"
            name="transitDays"
            type="number"
            min={1}
            max={180}
            required
            placeholder="18"
            invalid={!!fe.transitDays}
          />
          <FieldError>{fe.transitDays}</FieldError>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="carrierName">{t("carrierName")}</Label>
          <Input
            id="carrierName"
            name="carrierName"
            required
            placeholder="Hapag-Lloyd"
            invalid={!!fe.carrierName}
          />
          <FieldError>{fe.carrierName}</FieldError>
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

      {errMessage && <FormError>{errMessage}</FormError>}

      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {t("submit")}
      </Button>
    </form>
  );
}
