"use server";

/**
 * Geocoder abstraction. Switch via GEOCODER_PROVIDER env var.
 *
 * "mock"   — searches the Port table for partial city matches. Works because
 *            our seeded 159 ports include lat/lng for major coastal cities.
 *            Adequate for ExWorks factory-address resolution in the demo.
 * "mapbox" — real Mapbox Geocoding API (stub here; wire when keys arrive).
 *
 * The interface is small on purpose — Sprint 12 only needs city → lat/lng lookup.
 */

import { db } from "./db";

export type GeocodedCity = {
  name: string;
  country: string;
  lat: number;
  lng: number;
};

function getProvider(): "mock" | "mapbox" {
  return (process.env.GEOCODER_PROVIDER ?? "mock").toLowerCase() === "mapbox"
    ? "mapbox"
    : "mock";
}

export async function searchCities(query: string): Promise<GeocodedCity[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (getProvider() === "mapbox") {
    // Stub — lazy-import the SDK only when configured.
    throw new Error(
      "GEOCODER_PROVIDER=mapbox is not yet implemented. Stay on 'mock' until keys are wired."
    );
  }

  // Mock: pull from Port table since it has city names + lat/lng.
  const rows = await db.port.findMany({
    where: {
      AND: [{ lat: { not: null } }, { lng: { not: null } }, { name: { contains: q } }],
    },
    select: { name: true, country: true, lat: true, lng: true },
    take: 20,
  });

  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      name: r.name,
      country: r.country,
      lat: r.lat as number,
      lng: r.lng as number,
    }));
}
