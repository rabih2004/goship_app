"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

import {
  subscribeAction,
  cancelSubscriptionAction,
  type SubscribeState,
} from "@/lib/subscriptions-actions";

const initial: SubscribeState = { ok: false };

export function SubscribePanel({
  locale,
  priceUSDCents,
  tierName,
}: {
  locale: "en" | "ar";
  priceUSDCents: number;
  tierName: string;
}) {
  const t = useTranslations("Subscription");
  const [state, action, pending] = useActionState(subscribeAction, initial);

  const err =
    state.error === "auth"
      ? t("errAuth")
      : state.error === "wrongRole"
        ? t("errWrongRole")
        : state.error === "alreadyActive"
          ? t("errAlreadyActive")
          : state.error === "providerNotWired"
            ? t("errProviderNotWired")
            : state.error
              ? t("errUnknown")
              : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div className="text-base font-semibold text-zinc-900">{tierName}</div>
        <div className="mt-1 text-zinc-700">
          {t("tierLine", {
            price: `$${(priceUSDCents / 100).toFixed(2)}`,
          })}
        </div>
      </div>
      {err && <FormError>{err}</FormError>}
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {t("subscribeMock")}
      </Button>
      <p className="text-xs text-zinc-500">{t("mockNote")}</p>
    </form>
  );
}

export function CancelSubscriptionForm({ locale }: { locale: "en" | "ar" }) {
  const t = useTranslations("Subscription");
  return (
    <form
      action={cancelSubscriptionAction}
      onSubmit={(e) => {
        if (!confirm(t("cancelConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="text-xs text-rose-700 underline hover:text-rose-900"
      >
        {t("cancel")}
      </button>
    </form>
  );
}
