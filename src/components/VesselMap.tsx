"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(
  () => import("./VesselMapInner").then((m) => m.VesselMapInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500"
        style={{ height: 320 }}
      >
        Loading map…
      </div>
    ),
  }
);

export type VesselMapProps = {
  origin: { lat: number; lng: number; name: string; unlocode: string };
  destination: { lat: number; lng: number; name: string; unlocode: string };
  vessel: { lat: number; lng: number; fraction: number };
};

export function VesselMap(props: VesselMapProps) {
  return <Inner {...props} />;
}
