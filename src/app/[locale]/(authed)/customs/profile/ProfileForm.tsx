"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { updateCustomsProfileAction, type UpdateCustomsState } from "./actions";

type Props = {
  locale: "en" | "ar";
  profile: {
    displayName: string;
    countryCode: string;
    operationCities: string | null;
    licenseNumber: string | null;
    baseFeeUSDCents: number;
    docSetFeeUSDCents: number;
  };
};

const initialState: UpdateCustomsState = { ok: false };

export function ProfileForm({ locale, profile }: Props) {
  const [state, action, pending] = useActionState(updateCustomsProfileAction, initialState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

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
          <div>
            <Label htmlFor="licenseNumber">License number</Label>
            <Input
              id="licenseNumber"
              name="licenseNumber"
              defaultValue={profile.licenseNumber ?? ""}
              placeholder="Optional"
              invalid={!!fe.licenseNumber}
            />
            <FieldError>{fe.licenseNumber}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="operationCities">Operation cities</Label>
            <Input
              id="operationCities"
              name="operationCities"
              defaultValue={profile.operationCities ?? ""}
              placeholder="e.g. Beirut, Tripoli, Sidon (comma-separated)"
              invalid={!!fe.operationCities}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Comma-separated list of cities you operate in. Leave blank to cover the entire country.
            </p>
            <FieldError>{fe.operationCities}</FieldError>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="baseFeeUSD">Base clearance fee (USD)</Label>
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
            <p className="mt-1 text-xs text-zinc-500">Flat fee per clearance job.</p>
            <FieldError>{fe.baseFeeUSD}</FieldError>
          </div>
          <div>
            <Label htmlFor="docSetFeeUSD">Document set fee (USD)</Label>
            <Input
              id="docSetFeeUSD"
              name="docSetFeeUSD"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(profile.docSetFeeUSDCents / 100).toFixed(2)}
              required
              invalid={!!fe.docSetFeeUSD}
            />
            <p className="mt-1 text-xs text-zinc-500">Charged per document set submitted.</p>
            <FieldError>{fe.docSetFeeUSD}</FieldError>
          </div>
        </div>
      </section>

      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}
