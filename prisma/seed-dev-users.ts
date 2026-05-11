/**
 * Dev-only seeder: creates 4 test accounts you can log in with locally.
 * Run via: npm run seed:dev
 *
 *   admin@test.local     / Test1234!  (ADMIN)
 *   customer@test.local  / Test1234!  (CUSTOMER)
 *   forwarder@test.local / Test1234!  (FORWARDER, with profile + 3 lanes)
 *   coworker@test.local  / Test1234!  (COWORKER, with profile in Beirut)
 *
 * Idempotent — re-running upserts.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Test1234!", 12);

  await db.user.upsert({
    where: { email: "admin@test.local" },
    update: { passwordHash: password, role: "ADMIN" },
    create: {
      email: "admin@test.local",
      name: "Admin User",
      role: "ADMIN",
      passwordHash: password,
    },
  });

  await db.user.upsert({
    where: { email: "customer@test.local" },
    update: { passwordHash: password, role: "CUSTOMER" },
    create: {
      email: "customer@test.local",
      name: "Customer User",
      role: "CUSTOMER",
      passwordHash: password,
    },
  });

  const forwarder = await db.user.upsert({
    where: { email: "forwarder@test.local" },
    update: { passwordHash: password, role: "FORWARDER" },
    create: {
      email: "forwarder@test.local",
      name: "Forwarder User",
      role: "FORWARDER",
      passwordHash: password,
    },
  });

  await db.forwarderProfile.upsert({
    where: { userId: forwarder.id },
    update: {}, // preserve existing onboardingComplete (real Stripe state)
    create: {
      userId: forwarder.id,
      companyName: "Test Forwarders Ltd.",
      countryCode: "LB",
      // Dev convenience: mark complete so quote-submission gate doesn't block
      // local testing. Real Stripe Connect onboarding will overwrite this on
      // subsequent webhook events.
      onboardingComplete: true,
    },
  });

  // Sample lanes — only seed if Port table has content (run npm run seed:ports first).
  const haveBeirut = await db.port.findUnique({ where: { unlocode: "LBBEY" } });
  if (haveBeirut) {
    const sampleLanes: Array<[string, string, number]> = [
      ["LBBEY", "DEHAM", 18],
      ["LBBEY", "FRMRS", 8],
      ["LBBEY", "ITGOA", 9],
    ];
    for (const [origin, destination, transitDays] of sampleLanes) {
      await db.lane.upsert({
        where: {
          forwarderId_originPortUnlocode_destinationPortUnlocode: {
            forwarderId: forwarder.id,
            originPortUnlocode: origin,
            destinationPortUnlocode: destination,
          },
        },
        update: { transitDays, active: true },
        create: {
          forwarderId: forwarder.id,
          originPortUnlocode: origin,
          destinationPortUnlocode: destination,
          transitDays,
        },
      });
    }
    console.log(`  forwarder + ${sampleLanes.length} sample lanes seeded.`);

    // Sample shipment + quote for the customer so the dashboards have content.
    const customer = await db.user.findUnique({
      where: { email: "customer@test.local" },
      select: { id: true },
    });
    if (customer) {
      const existing = await db.shipment.findFirst({
        where: {
          customerId: customer.id,
          originPortUnlocode: "LBBEY",
          destinationPortUnlocode: "DEHAM",
        },
        select: { id: true },
      });
      const shipment =
        existing ??
        (await db.shipment.create({
          data: {
            customerId: customer.id,
            originPortUnlocode: "LBBEY",
            destinationPortUnlocode: "DEHAM",
            containerType: "FORTY_FT",
            cargoDescription: "200 boxes of ceramic tiles, palletized",
            weightKg: 18000,
            readyDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            incoterm: "FOB",
            status: "RFQ_OPEN",
          },
          select: { id: true },
        }));

      await db.quote.upsert({
        where: {
          shipmentId_forwarderId: {
            shipmentId: shipment.id,
            forwarderId: forwarder.id,
          },
        },
        update: {},
        create: {
          shipmentId: shipment.id,
          forwarderId: forwarder.id,
          priceUSDCents: 320000, // $3,200
          transitDays: 18,
          carrierName: "Hapag-Lloyd",
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "PENDING",
        },
      });
      console.log("  + sample LBBEY→DEHAM (FOB) shipment with 1 quote.");

      // Sample ExWorks shipment: factory in Beirut, sea leg Beirut → Marseille.
      const existingExw = await db.shipment.findFirst({
        where: {
          customerId: customer.id,
          incoterm: "EXW",
        },
        select: { id: true },
      });
      const exwShipment = existingExw
        ? existingExw
        : await db.shipment.create({
            data: {
              customerId: customer.id,
              originPortUnlocode: "LBBEY",
              destinationPortUnlocode: "FRMRS",
              containerType: "TWENTY_FT",
              cargoDescription:
                "50 pallets of olive oil bottles, factory pickup required",
              weightKg: 9000,
              readyDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
              incoterm: "EXW",
              status: "RFQ_OPEN",
              factoryAddressLine: "Industrial Zone Hadath, Building 14, Beirut",
              factoryCity: "Beirut",
              factoryLat: 33.9,
              factoryLng: 35.51,
              pickupContactName: "Mohammed Khoury",
              pickupContactPhone: "+961 1 555 0123",
            },
            select: { id: true },
          });
      if (!existingExw) {
        console.log("  + sample EXW Beirut-factory → FRMRS shipment.");
      }

      // Sample sea-freight quote on the EXW shipment so the customer can book.
      await db.quote.upsert({
        where: {
          shipmentId_forwarderId: {
            shipmentId: exwShipment.id,
            forwarderId: forwarder.id,
          },
        },
        update: {},
        create: {
          shipmentId: exwShipment.id,
          forwarderId: forwarder.id,
          priceUSDCents: 240000, // $2,400
          transitDays: 8,
          carrierName: "CMA CGM",
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "PENDING",
        },
      });

      // Sample coworker pickup quote.
      const coworkerForSeed = await db.user.findUnique({
        where: { email: "coworker@test.local" },
        select: { id: true },
      });
      if (coworkerForSeed) {
        await db.coworkerQuote.upsert({
          where: {
            shipmentId_coworkerId: {
              shipmentId: exwShipment.id,
              coworkerId: coworkerForSeed.id,
            },
          },
          update: {},
          create: {
            shipmentId: exwShipment.id,
            coworkerId: coworkerForSeed.id,
            distanceKm: 12.5,
            priceUSDCents: 8500, // $85 — base $30 + ~$1.50/km × 12.5km × markup
            pickupTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            vehicleNote: "Truck-20ft LB-2103",
            notes: "Loading dock access from 8am–4pm only.",
            validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: "PENDING",
          },
        });
        console.log("  + sample coworker pickup quote on the EXW shipment.");
      }
    }
  } else {
    console.log("  (skipped lane/shipment seeding — run `npm run seed:ports` first)");
  }

  // Coworker — local pickup operator in Beirut. Beirut roughly at 33.90 N, 35.51 E.
  const coworker = await db.user.upsert({
    where: { email: "coworker@test.local" },
    update: { passwordHash: password, role: "COWORKER" },
    create: {
      email: "coworker@test.local",
      name: "Coworker User",
      role: "COWORKER",
      passwordHash: password,
    },
  });
  await db.coworkerProfile.upsert({
    where: { userId: coworker.id },
    update: {},
    create: {
      userId: coworker.id,
      displayName: "Beirut Pickup Co.",
      countryCode: "LB",
      cityArea: "Beirut, Lebanon",
      serviceCenterLat: 33.9,
      serviceCenterLng: 35.51,
      serviceRadiusKm: 60,
      perKmRateUSDCents: 150,
      baseFeeUSDCents: 3000,
      vehicleType: "Truck-20ft",
      vehicleCapacityKg: 5000,
      onboardingComplete: true,
    },
  });

  console.log("\nSeeded 4 dev users (password: Test1234!):");
  console.log("  admin@test.local      → ADMIN");
  console.log("  customer@test.local   → CUSTOMER");
  console.log("  forwarder@test.local  → FORWARDER + profile + 3 lanes");
  console.log("  coworker@test.local   → COWORKER + Beirut profile");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
