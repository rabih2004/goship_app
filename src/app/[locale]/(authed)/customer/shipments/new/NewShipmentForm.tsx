"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { PortSelect } from "@/components/PortSelect";
import { FactoryMap } from "@/components/FactoryMap";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";
import { cn } from "@/lib/cn";

import { createShipmentAction, type NewShipmentState } from "./actions";
import {
  getDestinationsFromOrigin,
  getNearbyCoworkers,
  type DestinationOption,
  type NearbyCoworker,
} from "./exw-queries";

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

function fmtUSD(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function NewShipmentForm({ locale }: { locale: "en" | "ar" }) {
  const t = useTranslations("Shipments");
  const tInco = useTranslations("Shipments.incoterm");
  const tIns = useTranslations("Insurance");
  const [state, action, pending] = useActionState(createShipmentAction, initialState);
  const [incoterm, setIncoterm] = useState<Incoterm>("FOB");
  const [wantsInsurance, setWantsInsurance] = useState(false);

  // EXW: destination auto-fill state
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [destSelection, setDestSelection] = useState<DestinationOption | null>(null);
  const [destPending, startDestFetch] = useTransition();

  // EXW: nearby coworker list + selection
  const [coworkers, setCoworkers] = useState<NearbyCoworker[]>([]);
  const [coworkersPending, startCoworkerFetch] = useTransition();
  const [selectedCoworkerId, setSelectedCoworkerId] = useState<string | null>(null);

  const fe = state.fieldErrors ?? {};

  const errMessage =
    state.error === "auth"
      ? t("errAuth")
      : state.error === "unknownPort"
        ? t("errUnknownPort")
        : state.error === "unknown"
          ? t("errUnknown")
          : null;

  function handleOriginPortSelected(port: { unlocode: string; name: string; country: string }) {
    setDestSelection(null);
    setDestinations([]);
    startDestFetch(async () => {
      const opts = await getDestinationsFromOrigin(port.unlocode);
      setDestinations(opts);
      // Auto-select if exactly one destination lane exists from this port.
      if (opts.length === 1) setDestSelection(opts[0]);
    });
  }

  function handleFactoryPinned(lat: number, lng: number) {
    setCoworkers([]);
    setSelectedCoworkerId(null);
    startCoworkerFetch(async () => {
      const list = await getNearbyCoworkers(lat, lng);
      setCoworkers(list);
    });
  }

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
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-sm font-medium text-zinc-900">
            {tInco("exwSectionTitle")}
          </h3>

          {/* Map: pins factory + selects nearest origin port */}
          <FactoryMap
            factoryAddressName="factoryAddressLine"
            cityName="factoryCity"
            latName="factoryCity_lat"
            lngName="factoryCity_lng"
            originPortName="originPortUnlocode"
            onPortSelected={handleOriginPortSelected}
            onFactoryPinned={handleFactoryPinned}
          />
          <FieldError>
            {fe.factoryAddressLine ?? fe.factoryCity ?? fe.originPortUnlocode}
          </FieldError>

          {/* Nearby coworker list — customer selects one to send a direct request */}
          {(coworkersPending || coworkers.length > 0) && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {coworkersPending
                  ? "Finding available pickup operators…"
                  : `Available pickup operators (${coworkers.length}) — select one to send a direct request`}
              </p>
              {selectedCoworkerId && (
                <p className="mb-2 text-xs text-emerald-700">
                  ✓ Direct request will be sent to the selected operator. They can accept or decline.
                </p>
              )}
              <input type="hidden" name="preferredCoworkerId" value={selectedCoworkerId ?? ""} />
              {!coworkersPending && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {coworkers.map((c) => {
                    const selected = selectedCoworkerId === c.userId;
                    const estCents = c.baseFeeUSDCents + Math.round(c.perKmRateUSDCents * c.distanceKm);
                    return (
                      <li key={c.userId}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCoworkerId(selected ? null : c.userId)
                          }
                          className={cn(
                            "w-full rounded-md border p-3 text-left text-sm transition",
                            selected
                              ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]"
                              : "border-zinc-200 bg-white hover:border-zinc-400"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-zinc-900">{c.displayName}</div>
                              <div className="text-xs text-zinc-500">{c.cityArea}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {c.ratingCount > 0 && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  ★ {c.ratingAvg.toFixed(1)}
                                </span>
                              )}
                              {selected && (
                                <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-medium text-white">
                                  Selected
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                            <span>🚚 {c.vehicleType}</span>
                            <span>{c.distanceKm} km away</span>
                            <span>Up to {c.vehicleCapacityKg.toLocaleString()} kg</span>
                          </div>
                          <div className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs">
                            <span className="font-medium text-zinc-900">
                              {fmtUSD(c.baseFeeUSDCents)} base
                            </span>
                            <span className="text-zinc-500">
                              {" "}+ {fmtUSD(c.perKmRateUSDCents)}/km
                            </span>
                            <span className="ml-2 text-zinc-400">
                              ≈ {fmtUSD(estCents)} for {c.distanceKm} km
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Factory contact */}
          <div className="grid gap-4 sm:grid-cols-2">
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
          {/* In EXW mode: show quick-pick buttons for lanes from the selected origin port */}
          {incoterm === "EXW" && destinations.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {destinations.map((d) => (
                <button
                  key={d.unlocode}
                  type="button"
                  onClick={() => setDestSelection(d)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs transition",
                    destSelection?.unlocode === d.unlocode
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] font-medium"
                      : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"
                  )}
                >
                  {d.name} ({d.unlocode})
                </button>
              ))}
            </div>
          )}
          {incoterm === "EXW" && destPending && (
            <p className="mb-1 text-xs text-zinc-400">Loading available destinations…</p>
          )}
          <PortSelect
            name="destinationPortUnlocode"
            invalid={!!fe.destinationPortUnlocode}
            controlledSelection={incoterm === "EXW" ? destSelection : undefined}
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

      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
        <input
          type="checkbox"
          name="needsCustomsClearance"
          className="mt-1 h-4 w-4 rounded border-zinc-300"
        />
        <span>
          <span className="font-medium text-zinc-900">
            {t("needsCustomsClearance")}
          </span>
          <span className="block text-xs text-zinc-500">
            {t("needsCustomsClearanceHint")}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm">
        <input
          type="checkbox"
          name="wantsInsurance"
          checked={wantsInsurance}
          onChange={(e) => setWantsInsurance(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-300"
        />
        <span className="flex-1">
          <span className="font-medium text-zinc-900">{tIns("optInLabel")}</span>
          <span className="block text-xs text-zinc-500">
            {tIns("optInHint", { rate: "1.5%" })}
          </span>
          {wantsInsurance && (
            <div className="mt-3">
              <Label htmlFor="cargoValueUSD">{tIns("cargoValueUSD")}</Label>
              <Input
                id="cargoValueUSD"
                name="cargoValueUSD"
                type="number"
                step="0.01"
                min={0}
                required={wantsInsurance}
                placeholder="25000"
                invalid={!!fe.cargoValueUSD}
              />
              <FieldError>{fe.cargoValueUSD}</FieldError>
            </div>
          )}
        </span>
      </label>

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
