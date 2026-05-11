"use server";

/**
 * Map data sources — geocoding, port suggestion, and driving routing.
 *
 * Provider selection follows the same pattern as payments / storage / email:
 *   MAP_PROVIDER=osm    — free OpenStreetMap services (Nominatim + OSRM public).
 *                         Rate-limited; not for high-volume production.
 *   MAP_PROVIDER=mapbox — real Mapbox APIs (stub for now; wire when keys arrive).
 *
 * Implementation note — `searchPlaces` and `getDrivingRoute` go through THIS
 * server module rather than the browser so we can set a descriptive User-Agent
 * (Nominatim requires it) and centralise rate-limiting / fallbacks.
 */

import { db } from "./db";
import { haversineKm, nearestK, roundKm } from "./geo";

const USER_AGENT =
  "GoShip-platform/0.1 (https://github.com/rabih2004/goship-app)";

function mapProvider(): "osm" | "mapbox" {
  return (process.env.MAP_PROVIDER ?? "osm").toLowerCase() === "mapbox"
    ? "mapbox"
    : "osm";
}

// =====================================================================
// Place search (free-text address / city / landmark)
// =====================================================================

export type PlaceHit = {
  displayName: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  type?: string;
};

export async function searchPlaces(query: string): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  if (mapProvider() === "mapbox") {
    throw new Error(
      "MAP_PROVIDER=mapbox is not yet implemented. Stay on 'osm' until keys are wired."
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
      // Nominatim asks for max 1 req/sec — short cache reduces load.
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.warn("Nominatim search failed:", res.status, res.statusText);
      return [];
    }
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      type?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        country?: string;
      };
    }>;
    return data.map((d) => ({
      displayName: d.display_name,
      lat: Number(d.lat),
      lng: Number(d.lon),
      city: d.address?.city ?? d.address?.town ?? d.address?.village,
      country: d.address?.country,
      type: d.type,
    }));
  } catch (e) {
    console.warn("Nominatim search error:", e);
    return [];
  }
}

// =====================================================================
// Reverse geocode (lat/lng → human-readable address)
// =====================================================================

export type ReverseHit = {
  displayName: string;
  city?: string;
  country?: string;
};

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseHit | null> {
  if (mapProvider() === "mapbox") {
    throw new Error("MAP_PROVIDER=mapbox is not yet implemented.");
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: { city?: string; town?: string; village?: string; country?: string };
    };
    if (!data.display_name) return null;
    return {
      displayName: data.display_name,
      city: data.address?.city ?? data.address?.town ?? data.address?.village,
      country: data.address?.country,
    };
  } catch (e) {
    console.warn("Nominatim reverse error:", e);
    return null;
  }
}

// =====================================================================
// Nearest origin port suggestions
// =====================================================================

export type SuggestedPort = {
  unlocode: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  distanceKm: number;
};

export async function suggestNearestPorts(
  lat: number,
  lng: number,
  k = 3
): Promise<SuggestedPort[]> {
  const ports = await db.port.findMany({
    where: { AND: [{ lat: { not: null } }, { lng: { not: null } }] },
    select: { unlocode: true, name: true, country: true, lat: true, lng: true },
  });

  return nearestK(ports, lat, lng, k).map((p) => ({
    unlocode: p.unlocode,
    name: p.name,
    country: p.country,
    lat: p.lat,
    lng: p.lng,
    distanceKm: roundKm(p.distanceKm),
  }));
}

// =====================================================================
// Driving route (factory → port)
// =====================================================================

export type DrivingRoute = {
  distanceKm: number;
  durationMin: number;
  /** Polyline as [lng, lat] pairs (GeoJSON convention). */
  geometry: Array<[number, number]>;
};

export async function getDrivingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DrivingRoute | null> {
  if (mapProvider() === "mapbox") {
    throw new Error(
      "MAP_PROVIDER=mapbox is not yet implemented for routing."
    );
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      console.warn("OSRM route failed:", res.status, res.statusText);
      // Fall back to a straight-line approximation so the UI still has something.
      const km = haversineKm(fromLat, fromLng, toLat, toLng);
      return {
        distanceKm: roundKm(km),
        durationMin: Math.round((km / 60) * 60), // assume 60 km/h average
        geometry: [
          [fromLng, fromLat],
          [toLng, toLat],
        ],
      };
    }
    const data = (await res.json()) as {
      code: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: Array<[number, number]>; type: string };
      }>;
    };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: roundKm(route.distance / 1000),
      durationMin: Math.round(route.duration / 60),
      geometry: route.geometry.coordinates,
    };
  } catch (e) {
    console.warn("OSRM route error:", e);
    return null;
  }
}
