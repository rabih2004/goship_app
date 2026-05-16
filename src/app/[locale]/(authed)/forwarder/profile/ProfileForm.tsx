"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { updateForwarderProfileAction, type UpdateForwarderState } from "./actions";

type Props = {
  locale: "en" | "ar";
  profile: {
    companyName: string;
    registrationNumber: string | null;
    countryCode: string;
  };
};

const initialState: UpdateForwarderState = { ok: false };

export function ProfileForm({ locale, profile }: Props) {
  const [state, action, pending] = useActionState(updateForwarderProfileAction, initialState);
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

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Company details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={profile.companyName}
              required
              invalid={!!fe.companyName}
            />
            <FieldError>{fe.companyName}</FieldError>
          </div>
          <div>
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              defaultValue={profile.registrationNumber ?? ""}
              placeholder="Optional"
              invalid={!!fe.registrationNumber}
            />
            <FieldError>{fe.registrationNumber}</FieldError>
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

      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}
