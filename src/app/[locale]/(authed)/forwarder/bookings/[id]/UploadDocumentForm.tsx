"use client";

import { useActionState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError } from "@/components/ui/FormError";

import { uploadDocumentAction, type UploadState } from "./actions";

const initial: UploadState = { ok: false };

export function UploadDocumentForm({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: "en" | "ar";
}) {
  const t = useTranslations("Documents");
  const [state, action, pending] = useActionState(uploadDocumentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const errMsg =
    state.error === "tooLarge"
      ? t("errTooLarge")
      : state.error === "badType"
        ? t("errBadType")
        : state.error === "missing"
          ? t("errMissing")
          : state.error
            ? t("errUnknown")
            : null;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div>
          <Label htmlFor="docType">{t("type")}</Label>
          <select
            id="docType"
            name="type"
            defaultValue="BL"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <option value="BL">{t("typeBL")}</option>
            <option value="INVOICE">{t("typeINVOICE")}</option>
            <option value="PACKING_LIST">{t("typePACKING_LIST")}</option>
            <option value="OTHER">{t("typeOTHER")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="docFile">{t("file")}</Label>
          <input
            id="docFile"
            type="file"
            name="file"
            required
            accept="application/pdf,image/png,image/jpeg"
            className="mt-1 block w-full text-sm text-zinc-700 file:me-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">{t("hint")}</p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" loading={pending}>
          {t("uploadBtn")}
        </Button>
      </div>

      {errMsg && <FormError>{errMsg}</FormError>}
    </form>
  );
}
