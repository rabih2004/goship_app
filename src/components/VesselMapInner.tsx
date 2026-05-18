"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import { interpolateGreatCircle } from "@/lib/vessel-tracking";

import type { VesselMapProps } from "./VesselMap";

const PORT_ICON = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:9999px;background:#225cff;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const VESSEL_ICON = L.divIcon({
  className: "",
  html: '<div style="width:30px;height:30px;border-radius:9999px;background:#2563eb;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;line-height:1;">⚓</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function VesselMapInner({ origin, destination, vessel }: VesselMapProps) {
  // Plot the great-circle route as 64 segments so it curves naturally on
  // long lanes instead of looking like a straight rhumb line.
  const route = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const p = interpolateGreatCircle(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
        i / 64
      );
      pts.push([p.lat, p.lng]);
    }
    return pts;
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  // Center the map on the vessel; bounds fit-to-all on first render.
  const bounds = L.latLngBounds([
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
    [vessel.lat, vessel.lng],
  ]).pad(0.2);

  return (
    <div
      className="overflow-hidden rounded-lg border border-zinc-200"
      style={{ height: 320 }}
    >
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <Polyline
          positions={route}
          pathOptions={{
            color: "#225cff",
            weight: 3,
            dashArray: "6 6",
            opacity: 0.85,
          }}
        />

        <Marker position={[origin.lat, origin.lng]} icon={PORT_ICON}>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span className="text-xs font-medium">
              {origin.name} ({origin.unlocode})
            </span>
          </Tooltip>
        </Marker>

        <Marker position={[destination.lat, destination.lng]} icon={PORT_ICON}>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span className="text-xs font-medium">
              {destination.name} ({destination.unlocode})
            </span>
          </Tooltip>
        </Marker>

        <Marker position={[vessel.lat, vessel.lng]} icon={VESSEL_ICON}>
          <Tooltip permanent direction="top" offset={[0, -14]}>
            <span className="text-xs font-medium">
              {Math.round(vessel.fraction * 100)}% en route
            </span>
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  );
}
