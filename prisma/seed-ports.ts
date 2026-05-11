/**
 * Seeds the Port table with major world sea ports.
 * Source: prisma/data/ports.json (~150 ports curated for MVP coverage).
 *
 * Run via: npm run seed:ports
 *
 * Idempotent — re-runs upsert each port by UN/LOCODE.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

type PortRow = {
  u: string; // unlocode
  n: string; // name
  c: string; // ISO-3166 alpha-2 country
  lat?: number;
  lng?: number;
};

async function main() {
  const file = join(process.cwd(), "prisma", "data", "ports.json");
  const ports: PortRow[] = JSON.parse(readFileSync(file, "utf-8"));

  let upserted = 0;
  for (const p of ports) {
    await db.port.upsert({
      where: { unlocode: p.u },
      update: { name: p.n, country: p.c, lat: p.lat ?? null, lng: p.lng ?? null },
      create: {
        unlocode: p.u,
        name: p.n,
        country: p.c,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
      },
    });
    upserted += 1;
  }

  console.log(`Seeded ${upserted} ports.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
