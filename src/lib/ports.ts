"use server";

import { db } from "./db";

export type PortHit = {
  unlocode: string;
  name: string;
  country: string;
};

/**
 * Typeahead search across the Port table.
 * Matches against unlocode, name, and country (2-letter ISO).
 * Returns up to 20 hits, ranked: exact unlocode > unlocode prefix > name prefix > name contains.
 */
export async function searchPorts(query: string): Promise<PortHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const upper = q.toUpperCase();

  const raw = await db.port.findMany({
    where: {
      OR: [
        { unlocode: { contains: upper } },
        { name: { contains: q } },
        { country: upper.length === 2 ? upper : undefined },
      ],
    },
    select: { unlocode: true, name: true, country: true },
    take: 50,
  });

  const ranked = raw
    .map((p) => {
      const code = p.unlocode.toUpperCase();
      const name = p.name.toLowerCase();
      const ql = q.toLowerCase();

      let score = 100;
      if (code === upper) score = 0;
      else if (code.startsWith(upper)) score = 1;
      else if (name.startsWith(ql)) score = 2;
      else if (name.includes(ql)) score = 3;
      else if (p.country === upper) score = 4;

      return { hit: p, score };
    })
    .sort((a, b) => a.score - b.score || a.hit.name.localeCompare(b.hit.name))
    .slice(0, 20)
    .map((r) => r.hit);

  return ranked;
}
