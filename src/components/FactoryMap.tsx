"use client";

import dynamic from "next/dynamic";

/**
 * Public-facing wrapper. Leaflet touches `window` at import time, so the
 * real component is loaded client-only via `next/dynamic({ ssr: false })`.
 * SSR users get a placeholder skeleton until the bundle hydrates.
 */
const Inner = dynamic(
  () => import("./FactoryMapInner").then((m) => m.FactoryMapInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500"
        style={{ height: 420 }}
      >
        Loading map…
      </div>
    ),
  }
);

export function FactoryMap(props: {
  factoryAddressName: string;
  cityName: string;
  latName: string;
  lngName: string;
  originPortName: string;
  defaultCenter?: [number, number];
  onPortSelected?: (port: { unlocode: string; name: string; country: string }) => void;
  onFactoryPinned?: (lat: number, lng: number) => void;
}) {
  return <Inner {...props} />;
}
