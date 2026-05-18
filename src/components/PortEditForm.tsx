"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { updatePortAction, deletePortAction, type PortActionState } from "@/lib/ports-actions";

const initial: PortActionState = { ok: false };

type Port = {
  unlocode: string;
  name: string;
  country: string;
  lat: number | null;
  lng: number | null;
};

export function PortEditForm({
  port,
  locale,
  backHref,
}: {
  port: Port;
  locale: "en" | "ar";
  backHref: string;
}) {
  const [state, action, pending] = useActionState(updatePortAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
        <input type="hidden" name="locale" value={locale} />
        {/* unlocode is fixed — sent as hidden to action for the WHERE clause */}
        <input type="hidden" name="unlocode" value={port.unlocode} />

        {state.ok && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            Port updated.
          </div>
        )}
        {state.error === "auth" && <FormError>Not authorised.</FormError>}
        {state.error === "notFound" && <FormError>Port not found.</FormError>}
        {state.error === "unknown" && <FormError>Something went wrong. Please try again.</FormError>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>UN/LOCODE</Label>
            <Input value={port.unlocode} readOnly className="bg-zinc-50 text-zinc-500 cursor-not-allowed font-mono" />
            <p className="mt-1 text-xs text-zinc-400">UN/LOCODE cannot be changed.</p>
          </div>
          <div>
            <Label htmlFor="pe-country">Country</Label>
            <Input
              id="pe-country"
              name="country"
              defaultValue={port.country}
              maxLength={2}
              className="uppercase"
              required
              invalid={!!fe.country}
            />
            <FieldError>{fe.country}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="pe-name">Port name</Label>
            <Input
              id="pe-name"
              name="name"
              defaultValue={port.name}
              required
              invalid={!!fe.name}
            />
            <FieldError>{fe.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="pe-lat">Latitude</Label>
            <Input
              id="pe-lat"
              name="lat"
              type="number"
              step="any"
              min={-90}
              max={90}
              defaultValue={port.lat ?? ""}
              placeholder="Optional"
              invalid={!!fe.lat}
            />
            <FieldError>{fe.lat}</FieldError>
          </div>
          <div>
            <Label htmlFor="pe-lng">Longitude</Label>
            <Input
              id="pe-lng"
              name="lng"
              type="number"
              step="any"
              min={-180}
              max={180}
              defaultValue={port.lng ?? ""}
              placeholder="Optional"
              invalid={!!fe.lng}
            />
            <FieldError>{fe.lng}</FieldError>
          </div>
        </div>

        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </form>

      {/* Delete section */}
      <div className="rounded-lg border border-red-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-red-700">Delete port</h2>
        <p className="mb-4 text-xs text-zinc-500">
          This cannot be undone. Ports referenced by active lanes or shipments cannot be deleted.
        </p>
        <form action={deletePortAction}>
          <input type="hidden" name="unlocode" value={port.unlocode} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="backHref" value={backHref} />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            onClick={(e) => {
              if (!window.confirm(`Delete port ${port.unlocode} — ${port.name}? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            Delete {port.unlocode}
          </Button>
        </form>
      </div>
    </div>
  );
}
