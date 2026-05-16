"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { acceptPickupRequestAction, declinePickupRequestAction } from "./actions";

export function DirectRequestActions({
  shipmentId,
  locale,
  estimatedCents,
  portDistanceKm,
}: {
  shipmentId: string;
  locale: string;
  estimatedCents: number;
  portDistanceKm: number;
}) {
  const [acceptPending, startAccept] = useTransition();
  const [declinePending, startDecline] = useTransition();

  function handleAccept() {
    startAccept(async () => {
      await acceptPickupRequestAction(shipmentId, locale);
    });
  }

  function handleDecline() {
    if (
      !confirm(
        "Declining will notify all coworkers in your country about this job. Continue?"
      )
    )
      return;
    startDecline(async () => {
      await declinePickupRequestAction(shipmentId, locale);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleAccept} loading={acceptPending} disabled={declinePending}>
        Accept — submit ${(estimatedCents / 100).toFixed(0)} quote ({portDistanceKm} km)
      </Button>
      <button
        type="button"
        onClick={handleDecline}
        disabled={acceptPending || declinePending}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
      >
        {declinePending ? "Declining…" : "Decline & open to country"}
      </button>
    </div>
  );
}
