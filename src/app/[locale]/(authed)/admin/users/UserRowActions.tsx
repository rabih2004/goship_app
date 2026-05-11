"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { suspendUserAction, unsuspendUserAction } from "./actions";

export function UserRowActions({
  userId,
  locale,
  suspended,
  isSelf,
}: {
  userId: string;
  locale: "en" | "ar";
  suspended: boolean;
  isSelf: boolean;
}) {
  const t = useTranslations("Admin");
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return <span className="text-xs text-zinc-400">{t("isYou")}</span>;
  }

  if (suspended) {
    return (
      <form action={(fd) => startTransition(() => unsuspendUserAction(fd))}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="secondary" loading={pending}>
          {t("unsuspend")}
        </Button>
      </form>
    );
  }

  return (
    <form
      action={(fd) => startTransition(() => suspendUserAction(fd))}
      onSubmit={(e) => {
        if (!confirm(t("confirmSuspend"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="danger" loading={pending}>
        {t("suspend")}
      </Button>
    </form>
  );
}
