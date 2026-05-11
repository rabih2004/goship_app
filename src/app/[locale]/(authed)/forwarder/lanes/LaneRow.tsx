"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { toggleLaneAction, deleteLaneAction } from "./actions";

export type LaneRowData = {
  id: string;
  origin: string;
  originUnlocode: string;
  destination: string;
  destinationUnlocode: string;
  transitDays: number;
  active: boolean;
};

export function LaneRow({ lane }: { lane: LaneRowData }) {
  const t = useTranslations("Lanes");
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="py-3 pe-4">
        <div className="font-medium text-zinc-900">{lane.origin}</div>
        <div className="text-xs text-zinc-500">{lane.originUnlocode}</div>
      </td>
      <td className="py-3 pe-4">
        <div className="font-medium text-zinc-900">{lane.destination}</div>
        <div className="text-xs text-zinc-500">{lane.destinationUnlocode}</div>
      </td>
      <td className="py-3 pe-4 text-sm text-zinc-700">{lane.transitDays}</td>
      <td className="py-3 pe-4">
        <span
          className={
            lane.active
              ? "rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
              : "rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700"
          }
        >
          {lane.active ? t("active") : t("inactive")}
        </span>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <form
            action={(fd) => startTransition(() => toggleLaneAction(fd))}
          >
            <input type="hidden" name="id" value={lane.id} />
            <Button type="submit" variant="ghost" loading={pending}>
              {lane.active ? t("disable") : t("enable")}
            </Button>
          </form>
          <form
            action={(fd) => startTransition(() => deleteLaneAction(fd))}
            onSubmit={(e) => {
              if (!confirm(t("confirmDelete"))) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={lane.id} />
            <Button type="submit" variant="danger" loading={pending}>
              {t("delete")}
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}
