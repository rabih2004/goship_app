"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError } from "@/components/ui/FormError";
import { Link } from "@/i18n/navigation";

import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = { ok: false };

export function SignInForm({
  locale,
  callbackUrl,
}: {
  locale: "en" | "ar";
  callbackUrl?: string;
}) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error === "invalidCredentials" && (
        <FormError>{t("invalidCredentials")}</FormError>
      )}
      {state.error === "validation" && <FormError>{t("invalidCredentials")}</FormError>}

      <Button type="submit" loading={pending}>
        {t("submitSignIn")}
      </Button>

      <p className="text-center text-sm text-zinc-600">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="text-[var(--brand)] underline">
          {t("submitSignUp")}
        </Link>
      </p>
    </form>
  );
}
