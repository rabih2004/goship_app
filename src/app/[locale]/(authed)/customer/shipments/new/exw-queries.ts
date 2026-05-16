"use server";

import { db } from "@/lib/db";

export type DestinationOption = {
  unlocode: string;
  name: string;
  country: string;
};

export type NearbyCoworker = {
  userId: string;
  displayName: string;
  cityArea: string;
  vehicleType: string;
  vehicleCapacityKg: number;
  baseFeeUSDCents: number;
  perKmRateUSDCents: number;
  serviceRadiusKm: number;
  ratingAvg: number;
  ratingCount: number;
  distanceKm: number;
};

export async function getDestinationsFromOrigin(
  originUnlocode: string
): Promise<DestinationOption[]> {
  const lanes = await db.lane.findMany({
    where: { active: true, originPortUnlocode: originUnlocode },
    select: {
      destinationPortUnlocode: true,
      destinationPort: { select: { name: true, country: true } },
    },
    distinct: ["destinationPortUnlocode"],
    orderBy: { destinationPortUnlocode: "asc" },
  });
  return lanes.map((l) => ({
    unlocode: l.destinationPortUnlocode,
    name: l.destinationPort.name,
    country: l.destinationPort.country,
  }));
}

const EARTH_KM = 6371;
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbyCoworkers(
  lat: number,
  lng: number
): Promise<NearbyCoworker[]> {
  const all = await db.coworkerProfile.findMany({
    where: {
      onboardingComplete: true,
      NOT: [{ serviceCenterLat: null }, { serviceCenterLng: null }],
    },
    select: {
      userId: true,
      displayName: true,
      cityArea: true,
      vehicleType: true,
      vehicleCapacityKg: true,
      baseFeeUSDCents: true,
      perKmRateUSDCents: true,
      serviceRadiusKm: true,
      serviceCenterLat: true,
      serviceCenterLng: true,
      ratingAvg: true,
      ratingCount: true,
    },
  });

  return all
    .map((c) => ({
      userId: c.userId,
      displayName: c.displayName,
      cityArea: c.cityArea,
      vehicleType: c.vehicleType,
      vehicleCapacityKg: c.vehicleCapacityKg,
      baseFeeUSDCents: c.baseFeeUSDCents,
      perKmRateUSDCents: c.perKmRateUSDCents,
      serviceRadiusKm: c.serviceRadiusKm,
      ratingAvg: c.ratingAvg,
      ratingCount: c.ratingCount,
      distanceKm:
        Math.round(
          haversineKm(lat, lng, c.serviceCenterLat!, c.serviceCenterLng!) * 10
        ) / 10,
    }))
    .filter((c) => c.distanceKm <= c.serviceRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
