"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { searchPlaces, type PlaceHit } from "@/lib/maps";
import { cn } from "@/lib/cn";
import { updateCoworkerProfileAction, type UpdateProfileState } from "./actions";

const VEHICLE_TYPES = ["Van", "Truck-20ft", "Truck-40ft", "Flatbed"] as const;

type Props = {
  locale: "en" | "ar";
  profile: {
    displayName: string;
    countryCode: string;
    cityArea: string;
    serviceCenterLat: number | null;
    serviceCenterLng: number | null;
    serviceRadiusKm: number;
    baseFeeUSDCents: number;
    perKmRateUSDCents: number;
    vehicleType: string;
    vehicleCapacityKg: number;
  };
};

const initialState: UpdateProfileState = { ok: false };

export function ProfileForm({ locale, profile }: Props) {
  const [state, action, pending] = useActionState(updateCoworkerProfileAction, initialState);
  const fe = state.fieldErrors ?? {};

  // City / service-center geocoding
  const [cityQuery, setCityQuery] = useState(profile.cityArea);
  const [cityResults, setCityResults] = useState<PlaceHit[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [lat, setLat] = useState<number | "">(profile.serviceCenterLat ?? "");
  const [lng, setLng] = useState<number | "">(profile.serviceCenterLng ?? "");
  const [searchPending, startSearch] = useTransition();
  const cityWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cityQuery.length < 3 || cityQuery === profile.cityArea) {
      setCityResults([]);
      setCityOpen(false);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        const hits = await searchPlaces(cityQuery);
        setCityResults(hits);
        setCityOpen(true);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [cityQuery, profile.cityArea]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pickCity(hit: PlaceHit) {
    setCityQuery(hit.displayName);
    setLat(hit.lat);
    setLng(hit.lng);
    setCityResults([]);
    setCityOpen(false);
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="serviceCenterLat" value={lat} />
      <input type="hidden" name="serviceCenterLng" value={lng} />

      {state.ok && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Profile saved successfully.
        </div>
      )}
      {state.error && state.error !== "validation" && (
        <FormError>
          {state.error === "auth" ? "Not authorised." : "Something went wrong. Please try again."}
        </FormError>
      )}

      {/* Identity */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile.displayName}
              required
              invalid={!!fe.displayName}
            />
            <FieldError>{fe.displayName}</FieldError>
          </div>
          <div>
            <Label htmlFor="countryCode">Country code</Label>
            <Input
              id="countryCode"
              name="countryCode"
              defaultValue={profile.countryCode}
              maxLength={2}
              placeholder="LB"
              required
              invalid={!!fe.countryCode}
            />
            <FieldError>{fe.countryCode}</FieldError>
          </div>
        </div>
      </section>

      {/* Service area */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Service area</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2" ref={cityWrapRef}>
            <Label htmlFor="cityArea">City / area</Label>
            <div className="relative">
              <Input
                id="cityArea"
                name="cityArea"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                autoComplete="off"
                placeholder="e.g. Beirut, Lebanon"
                required
                invalid={!!fe.cityArea}
              />
              {cityOpen && (searchPending || cityResults.length > 0) && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
                  {searchPending && (
                    <li className="px-3 py-2 text-sm text-zinc-400">Searching…</li>
                  )}
                  {!searchPending && cityResults.map((h, i) => (
                    <li key={`${h.lat}-${h.lng}-${i}`}>
                      <button
                        type="button"
                        onClick={() => pickCity(h)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100"
                      >
                        {h.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {lat !== "" && lng !== "" && (
              <p className="mt-1 text-xs text-zinc-500">
                📍 {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </p>
            )}
            <FieldError>{fe.cityArea ?? fe.serviceCenterLat ?? fe.serviceCenterLng}</FieldError>
          </div>

          <div>
            <Label htmlFor="serviceRadiusKm">Service radius (km)</Label>
            <Input
              id="serviceRadiusKm"
              name="serviceRadiusKm"
              type="number"
              min={1}
              max={500}
              defaultValue={profile.serviceRadiusKm}
              required
              invalid={!!fe.serviceRadiusKm}
            />
            <FieldError>{fe.serviceRadiusKm}</FieldError>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="baseFeeUSD">Base fee (USD)</Label>
            <Input
              id="baseFeeUSD"
              name="baseFeeUSD"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(profile.baseFeeUSDCents / 100).toFixed(2)}
              required
              invalid={!!fe.baseFeeUSD}
            />
            <p className="mt-1 text-xs text-zinc-500">Minimum charge per job.</p>
            <FieldError>{fe.baseFeeUSD}</FieldError>
          </div>
          <div>
            <Label htmlFor="perKmRateUSD">Per-km rate (USD)</Label>
            <Input
              id="perKmRateUSD"
              name="perKmRateUSD"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(profile.perKmRateUSDCents / 100).toFixed(2)}
              required
              invalid={!!fe.perKmRateUSD}
            />
            <p className="mt-1 text-xs text-zinc-500">Charged per km of driving distance.</p>
            <FieldError>{fe.perKmRateUSD}</FieldError>
          </div>
        </div>
      </section>

      {/* Vehicle */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Vehicle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Vehicle type</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {VEHICLE_TYPES.map((v) => (
                <label
                  key={v}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition",
                    "has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand)]/5"
                  )}
                >
                  <input
                    type="radio"
                    name="vehicleType"
                    value={v}
                    defaultChecked={profile.vehicleType === v}
                    className="accent-[var(--brand)]"
                  />
                  {v}
                </label>
              ))}
            </div>
            <FieldError>{fe.vehicleType}</FieldError>
          </div>
          <div>
            <Label htmlFor="vehicleCapacityKg">Capacity (kg)</Label>
            <Input
              id="vehicleCapacityKg"
              name="vehicleCapacityKg"
              type="number"
              min={1}
              max={100000}
              defaultValue={profile.vehicleCapacityKg}
              required
              invalid={!!fe.vehicleCapacityKg}
            />
            <FieldError>{fe.vehicleCapacityKg}</FieldError>
          </div>
        </div>
      </section>

      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}
