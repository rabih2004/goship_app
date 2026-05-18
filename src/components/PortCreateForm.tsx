"use client";

import { useActionState, useEffect, useRef } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { createPortAction, type PortActionState } from "@/lib/ports-actions";

const initial: PortActionState = { ok: false };

export function PortCreateForm({ locale }: { locale: "en" | "ar" }) {
  const [state, action, pending] = useActionState(createPortAction, initial);
  const fe = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Add new port</h2>
      <input type="hidden" name="locale" value={locale} />

      {state.ok && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Port created successfully.
        </div>
      )}
      {state.error === "auth" && <FormError>Not authorised.</FormError>}
      {state.error === "unknown" && <FormError>Something went wrong. Please try again.</FormError>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="pc-unlocode">UN/LOCODE</Label>
          <Input
            id="pc-unlocode"
            name="unlocode"
            placeholder="LBBEY"
            className="uppercase"
            required
            invalid={!!fe.unlocode}
          />
          <FieldError>{fe.unlocode}</FieldError>
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="pc-name">Port name</Label>
          <Input
            id="pc-name"
            name="name"
            placeholder="Beirut"
            required
            invalid={!!fe.name}
          />
          <FieldError>{fe.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="pc-country">Country</Label>
          <Input
            id="pc-country"
            name="country"
            placeholder="LB"
            maxLength={2}
            className="uppercase"
            required
            invalid={!!fe.country}
          />
          <FieldError>{fe.country}</FieldError>
        </div>
        <div>
          <Label htmlFor="pc-lat">Latitude</Label>
          <Input
            id="pc-lat"
            name="lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            placeholder="33.8938"
            invalid={!!fe.lat}
          />
          <FieldError>{fe.lat}</FieldError>
        </div>
        <div>
          <Label htmlFor="pc-lng">Longitude</Label>
          <Input
            id="pc-lng"
            name="lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            placeholder="35.5018"
            invalid={!!fe.lng}
          />
          <FieldError>{fe.lng}</FieldError>
        </div>
      </div>

      <Button type="submit" loading={pending} size="sm">
        Add port
      </Button>
    </form>
  );
}
