/**
 * Pure helpers for coworker pickup pricing.
 *
 * Coworker rate model:
 *   price = baseFee + (perKmRate * distanceKm)
 *
 * Both rates are stored as integer USD cents on `CoworkerProfile`.
 * Distance comes from the great-circle (Haversine) between factory and origin port.
 */

export function suggestedPickupPriceCents(args: {
  baseFeeUSDCents: number;
  perKmRateUSDCents: number;
  distanceKm: number;
}): number {
  const variable = Math.round(args.perKmRateUSDCents * args.distanceKm);
  return args.baseFeeUSDCents + variable;
}

/**
 * Is the factory within the coworker's declared service radius? The check uses
 * Haversine distance — driving distance via OSRM may be longer but matches
 * coworker advertising in "as the crow flies" terms.
 */
export function isWithinServiceRadius(args: {
  distanceKm: number;
  serviceRadiusKm: number;
}): boolean {
  return args.distanceKm <= args.serviceRadiusKm;
}
