"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";

import { resolveDisputeAction, type ResolveDisputeState } from "@/lib/disputes";

const initial: ResolveDisputeState = { ok: false };

export function ResolveDisputeForm({
  disputeId,
  locale,
}: {
  disputeId: string;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Dispute");
  const [state, action, pending] = useActionState(resolveDisputeAction, initial);
  const fe = state.fieldErrors ?? {};

  const err =
    state.error === "auth"
      ? t("errAuth")
      : state.error === "notFound"
        ? t("errNotFound")
        : state.error === "validation"
          ? t("errValidation")
          : state.error
            ? t("errUnknown")
            : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="disputeId" value={disputeId} />
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor={`adminNote-${disputeId}`}>{t("adminNoteLabel")}</Label>
        <textarea
          id={`adminNote-${disputeId}`}
          name="adminNote"
          rows={3}
          minLength={1}
          maxLength={4000}
          required
          placeholder={t("adminNotePlaceholder")}
          className="block w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <FieldError>{fe.adminNote}</FieldError>
      </div>

      {err && <FormError>{err}</FormError>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="resolution" value="RESOLVED" loading={pending}>
          {t("markResolved")}
        </Button>
        <button
          type="submit"
          name="resolution"
          value="REJECTED"
          disabled={pending}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {t("markRejected")}
        </button>
      </div>
    </form>
  );
}
