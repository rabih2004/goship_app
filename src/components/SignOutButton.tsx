"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

export function SignOutButton({ locale }: { locale: "en" | "ar" }) {
  const t = useTranslations("Nav");
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => signOutAction(formData))}
    >
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="ghost" loading={pending}>
        {t("signOut")}
      </Button>
    </form>
  );
}
