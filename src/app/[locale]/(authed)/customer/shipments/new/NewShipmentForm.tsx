"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { PortSelect } from "@/components/PortSelect";
import { FactoryMap } from "@/components/FactoryMap";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";
import { cn } from "@/lib/cn";

import { createShipmentAction, type NewShipmentState } from "./actions";

const initialState: NewShipmentState = { ok: false };

const CONTAINER_OPTIONS: Array<{
  value: "TWENTY_FT" | "FORTY_FT" | "FORTY_HC" | "LCL";
  key: "twentyFt" | "fortyFt" | "fortyHC" | "lcl";
}> = [
  { value: "TWENTY_FT", key: "twentyFt" },
  { value: "FORTY_FT", key: "fortyFt" },
  { value: "FORTY_HC", key: "fortyHC" },
  { value: "LCL", key: "lcl" },
];

type Incoterm = "FOB" | "EXW";

export function NewShipmentForm({ locale }: { locale: "en" | "ar" }) {
  const t = useTranslations("Shipments");
  const tInco = useTranslations("Shipments.incoterm");
  const [state, action, pending] = useActionState(createShipmentAction, initialState);
  const [incoterm, setIncoterm] = useState<Incoterm>("FOB");
  const fe = state.fieldErrors ?? {};

  const errMessage =
    state.error === "auth"
      ? t("errAuth")
      : state.error === "unknownPort"
        ? t("errUnknownPort")
        : state.error === "unknown"
          ? t("errUnknown")
          : null;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="incoterm" value={incoterm} />

      <div>
        <Label>{tInco("label")}</Label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:max-w-sm">
          <IncotermTab
            value="FOB"
            label={tInco("fobLabel")}
            description={tInco("fobDescription")}
            checked={incoterm === "FOB"}
            onClick={() => setIncoterm("FOB")}
          />
          <IncotermTab
            value="EXW"
            label={tInco("exwLabel")}
            description={tInco("exwDescription")}
            checked={incoterm === "EXW"}
            onClick={() => setIncoterm("EXW")}
          />
        </div>
      </div>

      {incoterm === "EXW" && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-900">
            {tInco("exwSectionTitle")}
          </h3>
          <FactoryMap
            factoryAddressName="factoryAddressLine"
            cityName="factoryCity"
            latName="factoryCity_lat"
            lngName="factoryCity_lng"
            originPortName="originPortUnlocode"
          />
          <FieldError>
            {fe.factoryAddressLine ?? fe.factoryCity ?? fe.originPortUnlocode}
          </FieldError>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pickupContactName">{tInco("pickupContactName")}</Label>
              <Input
                id="pickupContactName"
                name="pickupContactName"
                required={incoterm === "EXW"}
                placeholder={tInco("pickupContactNamePlaceholder")}
                invalid={!!fe.pickupContactName}
              />
              <FieldError>{fe.pickupContactName}</FieldError>
            </div>
            <div>
              <Label htmlFor="pickupContactPhone">{tInco("pickupContactPhone")}</Label>
              <Input
                id="pickupContactPhone"
                name="pickupContactPhone"
                type="tel"
                required={incoterm === "EXW"}
                placeholder="+961 …"
                invalid={!!fe.pickupContactPhone}
              />
              <FieldError>{fe.pickupContactPhone}</FieldError>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {incoterm === "FOB" ? (
          <div>
            <Label>{t("origin")}</Label>
            <PortSelect name="originPortUnlocode" invalid={!!fe.originPortUnlocode} />
            <FieldError>{fe.originPortUnlocode}</FieldError>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div>
          <Label>{t("destination")}</Label>
          <PortSelect
            name="destinationPortUnlocode"
            invalid={!!fe.destinationPortUnlocode}
          />
          <FieldError>{fe.destinationPortUnlocode}</FieldError>
        </div>
      </div>

      <div>
        <Label>{t("containerType")}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CONTAINER_OPTIONS.map((opt, idx) => (
            <label
              key={opt.value}
              className={cn(
                "cursor-pointer rounded-md border bg-white p-3 text-center text-sm transition",
                "border-zinc-300 text-zinc-700 hover:border-zinc-400",
                "has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand)]/5 has-[:checked]:text-zinc-900"
              )}
            >
              <input
                type="radio"
                name="containerType"
                value={opt.value}
                defaultChecked={idx === 1}
                className="sr-only"
              />
              {t(`container.${opt.key}`)}
            </label>
          ))}
        </div>
        <FieldError>{fe.containerType}</FieldError>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
        <div>
          <Label htmlFor="cargoDescription">{t("cargoDescription")}</Label>
          <textarea
            id="cargoDescription"
            name="cargoDescription"
            required
            rows={3}
            maxLength={2000}
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-[var(--brand)]"
            placeholder={t("cargoPlaceholder")}
          />
          <FieldError>{fe.cargoDescription}</FieldError>
        </div>
        <div>
          <Label htmlFor="weightKg">{t("weightKg")}</Label>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            min={1}
            max={40000}
            required
            invalid={!!fe.weightKg}
          />
          <FieldError>{fe.weightKg}</FieldError>
        </div>
      </div>

      <div className="sm:max-w-xs">
        <Label htmlFor="readyDate">{t("readyDate")}</Label>
        <Input
          id="readyDate"
          name="readyDate"
          type="date"
          required
          invalid={!!fe.readyDate}
        />
        <FieldError>{fe.readyDate}</FieldError>
      </div>

      {errMessage && <FormError>{errMessage}</FormError>}

      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {t("publishRfq")}
      </Button>
    </form>
  );
}

function IncotermTab({
  value: _value,
  label,
  description,
  checked,
  onClick,
}: {
  value: string;
  label: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border bg-white p-3 text-start text-sm transition",
        checked
          ? "border-[var(--brand)] bg-[var(--brand)]/5 text-zinc-900"
          : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
      )}
    >
      <div className="font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{description}</div>
    </button>
  );
}
