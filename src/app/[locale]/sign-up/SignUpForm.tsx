"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";
import { Link } from "@/i18n/navigation";

import { signUpAction, type SignUpState } from "./actions";

const initialState: SignUpState = { ok: false };

type Role = "CUSTOMER" | "FORWARDER" | "COWORKER" | "CUSTOMS_AGENT";

export function SignUpForm({
  locale,
  defaultRole,
}: {
  locale: "en" | "ar";
  defaultRole: Role;
}) {
  const t = useTranslations("Auth");
  const [role, setRole] = useState<Role>(defaultRole);
  const [state, action, pending] = useActionState(signUpAction, initialState);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-800">
          {t("role")}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RoleCard
            value="CUSTOMER"
            label={t("roleCustomer")}
            checked={role === "CUSTOMER"}
            onChange={() => setRole("CUSTOMER")}
          />
          <RoleCard
            value="FORWARDER"
            label={t("roleForwarder")}
            checked={role === "FORWARDER"}
            onChange={() => setRole("FORWARDER")}
          />
          <RoleCard
            value="COWORKER"
            label={t("roleCoworker")}
            checked={role === "COWORKER"}
            onChange={() => setRole("COWORKER")}
          />
          <RoleCard
            value="CUSTOMS_AGENT"
            label={t("roleCustomsAgent")}
            checked={role === "CUSTOMS_AGENT"}
            onChange={() => setRole("CUSTOMS_AGENT")}
          />
        </div>
      </fieldset>

      <div>
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required autoComplete="name" invalid={!!fe.name} />
        <FieldError>{fe.name}</FieldError>
      </div>

      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          invalid={!!fe.email}
        />
        <FieldError>{fe.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          invalid={!!fe.password}
        />
        <FieldError>{fe.password}</FieldError>
      </div>

      {role === "FORWARDER" && (
        <>
          <div>
            <Label htmlFor="companyName">{t("companyName")}</Label>
            <Input
              id="companyName"
              name="companyName"
              required
              invalid={!!fe.companyName}
            />
            <FieldError>{fe.companyName}</FieldError>
          </div>
          <div>
            <Label htmlFor="countryCode">{t("countryCode")}</Label>
            <Input
              id="countryCode"
              name="countryCode"
              required
              maxLength={2}
              placeholder="LB"
              className="uppercase"
              invalid={!!fe.countryCode}
            />
            <FieldError>{fe.countryCode}</FieldError>
          </div>
        </>
      )}

      {role === "COWORKER" && (
        <>
          <div>
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              name="displayName"
              required
              placeholder={t("displayNamePlaceholder")}
              invalid={!!fe.displayName}
            />
            <FieldError>{fe.displayName}</FieldError>
          </div>
          <div>
            <Label htmlFor="countryCode">{t("countryCode")}</Label>
            <Input
              id="countryCode"
              name="countryCode"
              required
              maxLength={2}
              placeholder="LB"
              className="uppercase"
              invalid={!!fe.countryCode}
            />
            <FieldError>{fe.countryCode}</FieldError>
          </div>
          <div>
            <Label htmlFor="cityArea">{t("cityArea")}</Label>
            <Input
              id="cityArea"
              name="cityArea"
              required
              placeholder={t("cityAreaPlaceholder")}
              invalid={!!fe.cityArea}
            />
            <FieldError>{fe.cityArea}</FieldError>
          </div>
        </>
      )}

      {role === "CUSTOMS_AGENT" && (
        <>
          <div>
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              name="displayName"
              required
              placeholder={t("customsFirmPlaceholder")}
              invalid={!!fe.displayName}
            />
            <FieldError>{fe.displayName}</FieldError>
          </div>
          <div>
            <Label htmlFor="countryCode">{t("operatingCountry")}</Label>
            <Input
              id="countryCode"
              name="countryCode"
              required
              maxLength={2}
              placeholder="DE"
              className="uppercase"
              invalid={!!fe.countryCode}
            />
            <FieldError>{fe.countryCode}</FieldError>
          </div>
          <div>
            <Label htmlFor="licenseNumber">{t("licenseNumber")}</Label>
            <Input
              id="licenseNumber"
              name="licenseNumber"
              maxLength={80}
              placeholder={t("licenseNumberPlaceholder")}
              invalid={!!fe.licenseNumber}
            />
            <FieldError>{fe.licenseNumber}</FieldError>
          </div>
        </>
      )}

      <input type="hidden" name="role" value={role} />

      {state.error === "emailTaken" && <FormError>{t("emailTaken")}</FormError>}
      {state.error === "unknown" && <FormError>{t("invalidCredentials")}</FormError>}

      <Button type="submit" loading={pending}>
        {t("submitSignUp")}
      </Button>

      <p className="text-center text-sm text-zinc-600">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="text-[var(--brand)] underline">
          {t("submitSignIn")}
        </Link>
      </p>
    </form>
  );
}

function RoleCard({
  value,
  label,
  checked,
  onChange,
}: {
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-md border p-3 text-sm transition ${
        checked
          ? "border-[var(--brand)] bg-[var(--brand)]/5 text-zinc-900"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      <input
        type="radio"
        name="_role_picker"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
