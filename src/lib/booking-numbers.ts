/**
 * Generates a human-friendly booking number: `GS-YYYY-XXXXXXXX`
 *
 * The 8-char suffix uses a Crockford-style alphabet (no 0/1/I/O) so the
 * code can be read aloud, typed by hand, and printed on shipping labels
 * without character-confusion errors.
 *
 *   32^8 = ~1.1 trillion combinations per year — collisions are astronomically
 *   rare, and the `bookingNumber` unique constraint catches any anyway.
 *
 * Pure function over a clock — accepts an optional `now` so tests can pin the year.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateBookingNumber(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `GS-${year}-${suffix}`;
}

/** Internal — exposed for tests. */
export const BOOKING_NUMBER_ALPHABET = ALPHABET;
