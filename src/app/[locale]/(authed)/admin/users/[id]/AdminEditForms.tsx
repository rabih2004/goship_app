"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { cn } from "@/lib/cn";
import {
  adminUpdateAccountAction,
  adminUpdateForwarderAction,
  adminUpdateCoworkerAction,
  adminUpdateCustomsAction,
  type AdminEditState,
} from "./actions";

const VEHICLE_TYPES = ["Van", "Truck-20ft", "Truck-40ft", "Flatbed"] as const;

const init: AdminEditState = { ok: false };

// ── Shared helpers ──────────────────────────────────────────────────────────

function SaveBanner({ ok }: { ok: boolean }) {
  if (!ok) return null;
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      Saved successfully.
    </div>
  );
}

function ErrBanner({ error }: { error?: string }) {
  if (!error || error === "validation") return null;
  return (
    <FormError>
      {error === "auth" ? "Not authorised." : "Something went wrong."}
    </FormError>
  );
}

// ── Account form ────────────────────────────────────────────────────────────

export function AccountForm({
  userId,
  locale,
  name,
  suspended,
}: {
  userId: string;
  locale: string;
  name: string | null;
  suspended: boolean;
}) {
  const [state, action, pending] = useActionState(adminUpdateAccountAction, init);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <SaveBanner ok={state.ok} />
      <ErrBanner error={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="acct-name">Display name</Label>
          <Input id="acct-name" name="name" defaultValue={name ?? ""} placeholder="Optional" invalid={!!fe.name} />
          <FieldError>{fe.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="acct-suspended">Account status</Label>
          <select
            id="acct-suspended"
            name="suspended"
            defaultValue={String(suspended)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="false">Active</option>
            <option value="true">Suspended</option>
          </select>
        </div>
      </div>

      <Button type="submit" loading={pending}>Save account</Button>
    </form>
  );
}

// ── Forwarder profile form ──────────────────────────────────────────────────

export function ForwarderProfileForm({
  userId,
  locale,
  profile,
}: {
  userId: string;
  locale: string;
  profile: {
    companyName: string;
    registrationNumber: string | null;
    countryCode: string;
    onboardingComplete: boolean;
  };
}) {
  const [state, action, pending] = useActionState(adminUpdateForwarderAction, init);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <SaveBanner ok={state.ok} />
      <ErrBanner error={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="fwd-company">Company name</Label>
          <Input id="fwd-company" name="companyName" defaultValue={profile.companyName} required invalid={!!fe.companyName} />
          <FieldError>{fe.companyName}</FieldError>
        </div>
        <div>
          <Label htmlFor="fwd-reg">Registration number</Label>
          <Input id="fwd-reg" name="registrationNumber" defaultValue={profile.registrationNumber ?? ""} placeholder="Optional" invalid={!!fe.registrationNumber} />
          <FieldError>{fe.registrationNumber}</FieldError>
        </div>
        <div>
          <Label htmlFor="fwd-cc">Country code</Label>
          <Input id="fwd-cc" name="countryCode" defaultValue={profile.countryCode} maxLength={2} required invalid={!!fe.countryCode} />
          <FieldError>{fe.countryCode}</FieldError>
        </div>
        <div>
          <Label htmlFor="fwd-onboard">Onboarding status</Label>
          <select
            id="fwd-onboard"
            name="onboardingComplete"
            defaultValue={String(profile.onboardingComplete)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="false">Pending</option>
            <option value="true">Complete</option>
          </select>
        </div>
      </div>

      <Button type="submit" loading={pending}>Save profile</Button>
    </form>
  );
}

// ── Coworker profile form ───────────────────────────────────────────────────

export function CoworkerProfileForm({
  userId,
  locale,
  profile,
}: {
  userId: string;
  locale: string;
  profile: {
    displayName: string;
    countryCode: string;
    cityArea: string;
    serviceRadiusKm: number;
    baseFeeUSDCents: number;
    perKmRateUSDCents: number;
    vehicleType: string;
    vehicleCapacityKg: number;
    onboardingComplete: boolean;
  };
}) {
  const [state, action, pending] = useActionState(adminUpdateCoworkerAction, init);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <SaveBanner ok={state.ok} />
      <ErrBanner error={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="cw-name">Display name</Label>
          <Input id="cw-name" name="displayName" defaultValue={profile.displayName} required invalid={!!fe.displayName} />
          <FieldError>{fe.displayName}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-cc">Country code</Label>
          <Input id="cw-cc" name="countryCode" defaultValue={profile.countryCode} maxLength={2} required invalid={!!fe.countryCode} />
          <FieldError>{fe.countryCode}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-city">City / area</Label>
          <Input id="cw-city" name="cityArea" defaultValue={profile.cityArea} required invalid={!!fe.cityArea} />
          <FieldError>{fe.cityArea}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-radius">Service radius (km)</Label>
          <Input id="cw-radius" name="serviceRadiusKm" type="number" min={1} max={500} defaultValue={profile.serviceRadiusKm} required invalid={!!fe.serviceRadiusKm} />
          <FieldError>{fe.serviceRadiusKm}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-cap">Capacity (kg)</Label>
          <Input id="cw-cap" name="vehicleCapacityKg" type="number" min={1} max={100000} defaultValue={profile.vehicleCapacityKg} required invalid={!!fe.vehicleCapacityKg} />
          <FieldError>{fe.vehicleCapacityKg}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-base">Base fee (USD)</Label>
          <Input id="cw-base" name="baseFeeUSD" type="number" min={0} step="0.01" defaultValue={(profile.baseFeeUSDCents / 100).toFixed(2)} required invalid={!!fe.baseFeeUSD} />
          <FieldError>{fe.baseFeeUSD}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-km">Per-km rate (USD)</Label>
          <Input id="cw-km" name="perKmRateUSD" type="number" min={0} step="0.01" defaultValue={(profile.perKmRateUSDCents / 100).toFixed(2)} required invalid={!!fe.perKmRateUSD} />
          <FieldError>{fe.perKmRateUSD}</FieldError>
        </div>
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
                <input type="radio" name="vehicleType" value={v} defaultChecked={profile.vehicleType === v} className="accent-[var(--brand)]" />
                {v}
              </label>
            ))}
          </div>
          <FieldError>{fe.vehicleType}</FieldError>
        </div>
        <div>
          <Label htmlFor="cw-onboard">Onboarding status</Label>
          <select
            id="cw-onboard"
            name="onboardingComplete"
            defaultValue={String(profile.onboardingComplete)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="false">Pending</option>
            <option value="true">Complete</option>
          </select>
        </div>
      </div>

      <Button type="submit" loading={pending}>Save profile</Button>
    </form>
  );
}

// ── Customs agent profile form ──────────────────────────────────────────────

export function CustomsProfileForm({
  userId,
  locale,
  profile,
}: {
  userId: string;
  locale: string;
  profile: {
    displayName: string;
    countryCode: string;
    operationCities: string | null;
    licenseNumber: string | null;
    baseFeeUSDCents: number;
    docSetFeeUSDCents: number;
    onboardingComplete: boolean;
  };
}) {
  const [state, action, pending] = useActionState(adminUpdateCustomsAction, init);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <SaveBanner ok={state.ok} />
      <ErrBanner error={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ca-name">Display name</Label>
          <Input id="ca-name" name="displayName" defaultValue={profile.displayName} required invalid={!!fe.displayName} />
          <FieldError>{fe.displayName}</FieldError>
        </div>
        <div>
          <Label htmlFor="ca-cc">Country code</Label>
          <Input id="ca-cc" name="countryCode" defaultValue={profile.countryCode} maxLength={2} required invalid={!!fe.countryCode} />
          <FieldError>{fe.countryCode}</FieldError>
        </div>
        <div>
          <Label htmlFor="ca-lic">License number</Label>
          <Input id="ca-lic" name="licenseNumber" defaultValue={profile.licenseNumber ?? ""} placeholder="Optional" invalid={!!fe.licenseNumber} />
          <FieldError>{fe.licenseNumber}</FieldError>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ca-cities">Operation cities</Label>
          <Input id="ca-cities" name="operationCities" defaultValue={profile.operationCities ?? ""} placeholder="e.g. Beirut, Tripoli (comma-separated)" invalid={!!fe.operationCities} />
          <FieldError>{fe.operationCities}</FieldError>
        </div>
        <div>
          <Label htmlFor="ca-base">Base clearance fee (USD)</Label>
          <Input id="ca-base" name="baseFeeUSD" type="number" min={0} step="0.01" defaultValue={(profile.baseFeeUSDCents / 100).toFixed(2)} required invalid={!!fe.baseFeeUSD} />
          <FieldError>{fe.baseFeeUSD}</FieldError>
        </div>
        <div>
          <Label htmlFor="ca-doc">Document set fee (USD)</Label>
          <Input id="ca-doc" name="docSetFeeUSD" type="number" min={0} step="0.01" defaultValue={(profile.docSetFeeUSDCents / 100).toFixed(2)} required invalid={!!fe.docSetFeeUSD} />
          <FieldError>{fe.docSetFeeUSD}</FieldError>
        </div>
        <div>
          <Label htmlFor="ca-onboard">Onboarding status</Label>
          <select
            id="ca-onboard"
            name="onboardingComplete"
            defaultValue={String(profile.onboardingComplete)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="false">Pending</option>
            <option value="true">Complete</option>
          </select>
        </div>
      </div>

      <Button type="submit" loading={pending}>Save profile</Button>
    </form>
  );
}
