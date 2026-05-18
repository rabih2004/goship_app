"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FieldError, FormError } from "@/components/ui/FormError";
import { updateAccountAction, type UpdateAccountState } from "@/lib/account-actions";

const initial: UpdateAccountState = { ok: false };

export function AccountForm({
  name,
  email,
  phone,
  preferredCurrency,
  currencies,
  locale,
}: {
  name: string;
  email: string;
  phone?: string | null;
  preferredCurrency: string;
  currencies: readonly string[];
  locale: "en" | "ar";
}) {
  const [state, action, pending] = useActionState(updateAccountAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {state.ok && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Account updated successfully.
        </div>
      )}
      {state.error === "auth" && <FormError>Not authorised.</FormError>}
      {state.error === "wrongPassword" && (
        <FormError>Current password is incorrect.</FormError>
      )}
      {state.error === "unknown" && (
        <FormError>Something went wrong. Please try again.</FormError>
      )}

      {/* Personal info */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Personal info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={name}
              required
              invalid={!!fe.name}
            />
            <FieldError>{fe.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="acc-email">Email address</Label>
            <Input
              id="acc-email"
              type="email"
              value={email}
              readOnly
              className="bg-zinc-50 text-zinc-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-zinc-400">Email cannot be changed here.</p>
          </div>
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={phone ?? ""}
              placeholder="+1 555 000 0000"
              invalid={!!fe.phone}
            />
            <FieldError>{fe.phone}</FieldError>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Preferences</h2>
        <div>
          <Label htmlFor="preferredCurrency">Display currency</Label>
          <p className="mb-2 text-xs text-zinc-500">
            Prices are shown in this currency. Settlement is always in USD.
          </p>
          <select
            id="preferredCurrency"
            name="preferredCurrency"
            defaultValue={preferredCurrency}
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError>{fe.preferredCurrency}</FieldError>
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Change password</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Leave all fields blank to keep your current password.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              invalid={!!fe.currentPassword}
            />
            <FieldError>{fe.currentPassword}</FieldError>
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              invalid={!!fe.newPassword}
            />
            <FieldError>{fe.newPassword}</FieldError>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              invalid={!!fe.confirmPassword}
            />
            <FieldError>{fe.confirmPassword}</FieldError>
          </div>
        </div>
      </section>

      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
