"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { formatUSD } from "@/lib/money";
import { cn } from "@/lib/cn";

import { acceptQuoteAction, type AcceptQuoteState } from "./actions";

const initialState: AcceptQuoteState = { ok: false };

type FreightOption = {
  id: string;
  forwarderName: string;
  carrierName: string;
  priceUSDCents: number;
  transitDays: number;
  isCheapest: boolean;
  isFastest: boolean;
};

type PickupOption = {
  id: string;
  coworkerName: string;
  vehicleNote: string | null;
  distanceKm: number;
  priceUSDCents: number;
};

type CustomsOption = {
  id: string;
  agentName: string;
  etaDays: number;
  priceUSDCents: number;
};

export function MultiLegBookingForm({
  shipmentId,
  locale,
  freight,
  pickup,
  customs,
  needsPickup,
  needsCustoms,
}: {
  shipmentId: string;
  locale: "en" | "ar";
  freight: FreightOption[];
  pickup: PickupOption[];
  customs: CustomsOption[];
  needsPickup: boolean;
  needsCustoms: boolean;
}) {
  const t = useTranslations("MultiLeg");
  const tQ = useTranslations("Quotes");
  const [state, action, pending] = useActionState(acceptQuoteAction, initialState);
  const [selFreight, setSelFreight] = useState<string | null>(
    freight[0]?.id ?? null
  );
  const [selPickup, setSelPickup] = useState<string | null>(
    pickup[0]?.id ?? null
  );
  const [selCustoms, setSelCustoms] = useState<string | null>(
    customs[0]?.id ?? null
  );

  const f = freight.find((x) => x.id === selFreight);
  const p = pickup.find((x) => x.id === selPickup);
  const c = customs.find((x) => x.id === selCustoms);
  const total =
    (f?.priceUSDCents ?? 0) +
    (needsPickup ? p?.priceUSDCents ?? 0 : 0) +
    (needsCustoms ? c?.priceUSDCents ?? 0 : 0);

  const errMsg =
    state.error === "pickupRequired"
      ? t("errPickupRequired")
      : state.error === "customsRequired"
        ? t("errCustomsRequired")
        : state.error === "shipmentNotOpen"
          ? tQ("errShipmentNotFound")
          : state.error === "quoteNotPending" ||
              state.error === "pickupNotPending" ||
              state.error === "customsNotPending"
            ? t("errQuoteStale")
            : state.error
              ? t("errUnknown")
              : null;

  const canSubmit =
    !!selFreight &&
    (!needsPickup || !!selPickup) &&
    (!needsCustoms || !!selCustoms);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="quoteId" value={selFreight ?? ""} />
      <input
        type="hidden"
        name="pickupQuoteId"
        value={needsPickup ? selPickup ?? "" : ""}
      />
      <input
        type="hidden"
        name="customsQuoteId"
        value={needsCustoms ? selCustoms ?? "" : ""}
      />

      <div
        className={cn(
          "grid gap-6",
          needsPickup && needsCustoms
            ? "lg:grid-cols-3"
            : needsPickup || needsCustoms
              ? "lg:grid-cols-2"
              : ""
        )}
      >
        <Column
          title={t("freightTitle")}
          subtitle={t("freightSubtitle")}
          empty={
            freight.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                {tQ("waiting")}
              </p>
            ) : null
          }
        >
          {freight.map((q) => (
            <RadioCard
              key={q.id}
              checked={selFreight === q.id}
              onClick={() => setSelFreight(q.id)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-zinc-900">{q.forwarderName}</span>
                <span className="text-base font-semibold text-zinc-900">
                  {formatUSD(q.priceUSDCents)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{tQ("carrier")}: {q.carrierName}</span>
                <span>·</span>
                <span>{tQ("transitDays", { days: q.transitDays })}</span>
                {q.isCheapest && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">
                    {tQ("cheapest")}
                  </span>
                )}
                {q.isFastest && !q.isCheapest && (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-800">
                    {tQ("fastest")}
                  </span>
                )}
              </div>
            </RadioCard>
          ))}
        </Column>

        {needsPickup && (
          <Column
            title={t("pickupTitle")}
            subtitle={t("pickupSubtitle")}
            empty={
              pickup.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                  {t("pickupWaiting")}
                </p>
              ) : null
            }
          >
            {pickup.map((q) => (
              <RadioCard
                key={q.id}
                checked={selPickup === q.id}
                onClick={() => setSelPickup(q.id)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-zinc-900">
                    {q.coworkerName}
                  </span>
                  <span className="text-base font-semibold text-zinc-900">
                    {formatUSD(q.priceUSDCents)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {t("kmRoute", { km: q.distanceKm })}
                  {q.vehicleNote ? ` · ${q.vehicleNote}` : ""}
                </div>
              </RadioCard>
            ))}
          </Column>
        )}

        {needsCustoms && (
          <Column
            title={t("customsTitle")}
            subtitle={t("customsSubtitle")}
            empty={
              customs.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500">
                  {t("customsWaiting")}
                </p>
              ) : null
            }
          >
            {customs.map((q) => (
              <RadioCard
                key={q.id}
                checked={selCustoms === q.id}
                onClick={() => setSelCustoms(q.id)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-zinc-900">{q.agentName}</span>
                  <span className="text-base font-semibold text-zinc-900">
                    {formatUSD(q.priceUSDCents)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {t("etaDaysLine", { days: q.etaDays })}
                </div>
              </RadioCard>
            ))}
          </Column>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div className="flex items-center justify-between">
          <div className="text-zinc-700">
            {!canSubmit
              ? t("selectAll")
              : t("totalLineParts", {
                  freight: formatUSD(f!.priceUSDCents),
                  pickup: needsPickup ? formatUSD(p!.priceUSDCents) : "—",
                  customs: needsCustoms ? formatUSD(c!.priceUSDCents) : "—",
                })}
          </div>
          <div className="text-xl font-semibold text-zinc-900">
            {formatUSD(total)}
          </div>
        </div>
      </div>

      {errMsg && <FormError>{errMsg}</FormError>}

      <Button
        type="submit"
        loading={pending}
        disabled={!canSubmit}
        className="w-full sm:w-auto self-end"
      >
        {t("bookBothCta")}
      </Button>
    </form>
  );
}

function Column({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  empty: React.ReactNode | null;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
      <p className="mt-0.5 mb-3 text-xs text-zinc-500">{subtitle}</p>
      {empty ?? <div className="space-y-2">{children}</div>}
    </div>
  );
}

function RadioCard({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-md border bg-white p-3 text-start text-sm transition",
        checked
          ? "border-[var(--brand)] bg-[var(--brand)]/5"
          : "border-zinc-300 hover:border-zinc-400"
      )}
    >
      {children}
    </button>
  );
}
