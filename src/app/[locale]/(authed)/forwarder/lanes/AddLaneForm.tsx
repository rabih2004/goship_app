"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { PortSelect } from "@/components/PortSelect";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FormError, FieldError } from "@/components/ui/FormError";

import { addLaneAction, type LaneState } from "./actions";

const initialState: LaneState = { ok: false };

export function AddLaneForm() {
  const t = useTranslations("Lanes");
  const [state, action, pending] = useActionState(addLaneAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const fe = state.fieldErrors ?? {};
  const errMessage =
    state.error === "duplicate"
      ? t("duplicateLane")
      : state.error === "unknownPort"
        ? t("unknownPort")
        : state.error === "auth"
          ? t("authRequired")
          : state.error === "unknown"
            ? t("unknown")
            : null;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-base font-medium text-zinc-900">{t("addTitle")}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>{t("origin")}</Label>
          <PortSelect
            name="originPortUnlocode"
            invalid={!!fe.originPortUnlocode}
          />
          <FieldError>{fe.originPortUnlocode}</FieldError>
        </div>
        <div>
          <Label>{t("destination")}</Label>
          <PortSelect
            name="destinationPortUnlocode"
            invalid={!!fe.destinationPortUnlocode}
          />
          <FieldError>{fe.destinationPortUnlocode}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
        <div>
          <Label htmlFor="transitDays">{t("transitDays")}</Label>
          <Input
            id="transitDays"
            name="transitDays"
            type="number"
            min={1}
            max={180}
            required
            invalid={!!fe.transitDays}
          />
          <FieldError>{fe.transitDays}</FieldError>
        </div>
        <Button type="submit" loading={pending} className="w-full sm:w-auto">
          {t("add")}
        </Button>
      </div>

      {errMessage && <FormError>{errMessage}</FormError>}
    </form>
  );
}
