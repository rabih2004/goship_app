"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";

import { sendMessageAction, type SendMessageState } from "@/lib/chat";

const initial: SendMessageState = { ok: false };

export function ChatComposer({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Chat");
  const [state, action, pending] = useActionState(sendMessageAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const errMsg =
    state.error === "notAParty"
      ? t("errNotAParty")
      : state.error === "validation"
        ? t("errValidation")
        : state.error
          ? t("errUnknown")
          : null;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-2 border-t border-zinc-200 bg-white p-3"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="locale" value={locale} />

      <textarea
        name="body"
        rows={2}
        maxLength={4000}
        placeholder={t("placeholder")}
        required
        className="block w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      />

      {errMsg && <FormError>{errMsg}</FormError>}

      <div className="flex items-center justify-end">
        <Button type="submit" loading={pending}>
          {t("send")}
        </Button>
      </div>
    </form>
  );
}
