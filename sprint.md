# GoShip — Sprint Log

A multi-sided freight-forwarding marketplace. Built sprint-by-sprint with Claude Code. This file is the canonical hand-off doc — read it first when starting a new session.

**Repo:** https://github.com/rabih2004/goship_app · **Local path:** `C:\Users\user\projects\goship_app`

---

## Quick-start for a new session

```bash
cd C:\Users\user\projects\goship_app
npm run dev          # Next 16, webpack (NOT turbopack — see "Dev quirks" below)
npm test             # Vitest, ~55 tests
npm run e2e          # Playwright golden path (needs dev server up)
npm run seed:ports   # 159 sea ports
npm run seed:dev     # 5 test accounts + sample shipments
```

Open http://localhost:3000/en.

**Test accounts (password `Test1234!` for all):**

| Email | Role | Notes |
|---|---|---|
| `admin@test.local` | ADMIN | Full admin panel access |
| `customer@test.local` | CUSTOMER | Has 2 sample shipments (1 FOB + 1 EXW LBBEY→DEHAM with customs requested) |
| `forwarder@test.local` | FORWARDER | Test Forwarders Ltd. (LB), 3 active lanes, onboarded |
| `coworker@test.local` | COWORKER | Beirut Pickup Co. (LB), Truck-20ft, $1.50/km, 60 km radius, onboarded |
| `customs@test.local` | CUSTOMS_AGENT | Hamburg Customs Brokers GmbH (DE), license DE-CB-2024-018734, onboarded |

---

## Stack

- **Next.js 16** (App Router + Server Actions) + React 19 + TypeScript
- **Tailwind 4** + custom UI primitives in `src/components/ui/`
- **Prisma 6** + **MySQL 5.7** (WAMP local at `127.0.0.1:3306`, DB `shipping_platform`)
- **Auth.js v5 beta** (credentials + JWT sessions)
- **next-intl 4** (English + Arabic, RTL with CSS-flipped route arrows)
- **Leaflet + react-leaflet** for the factory-pickup map
- **Vitest** for pure-helper tests · **Playwright** for golden-path e2e

---

## Architecture principle — provider flags

Every external integration follows the same pattern:
1. A `Provider` interface or thin export-set in `src/lib/<thing>.ts`
2. A **mock** adapter (deterministic, dev-friendly, no external calls)
3. A **real** adapter (lazy-imported so SDK isn't loaded in mock mode)
4. An env var `<THING>_PROVIDER=mock|real` flipping at runtime

Current flags (set in `.env`):

| Env var | Mock | Real | Notes |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `mock` (default) | `stripe` | Stripe Connect Express. Real flow blocked by UAE-platform → MENA Connect cross-border restriction. Currently mocked. |
| `STORAGE_PROVIDER` | `mock` | `s3` (active) | Currently using Cloudflare R2 with `business-digi` bucket. |
| `EMAIL_PROVIDER` | `mock` | `resend` (active) | Resend API key live. Domain not yet verified for outbound. |
| `MAP_PROVIDER` | `osm` (active) | `mapbox` (stub) | Nominatim + OSRM public services. Free, rate-limited. |
| `GEOCODER_PROVIDER` | `mock` (active) | `mapbox` (stub) | Mock searches the Port table for city matches. |

---

## Sprint-by-sprint summary

### Phase 1 — MVP (sprints 1–10)

#### Sprint 1 — Foundation
Scaffolded Next.js + TS + Tailwind + Prisma + Auth.js + next-intl. Locale routing under `[locale]/` (en, ar). Proxy middleware in `src/proxy.ts` (renamed from `middleware.ts` per Next 16). Brand landing at `/` redirects to `/{locale}`. Stub sign-in/sign-up/dashboard pages.

Key files: `prisma/schema.prisma`, `src/auth.ts`, `src/auth.config.ts`, `src/i18n/`, `src/middleware.ts` → `src/proxy.ts`, `src/app/[locale]/layout.tsx`.

#### Sprint 2 — Auth + role-based onboarding + dashboard redirect
Email/password sign-up with role selector (Customer / Forwarder / Admin). Sign-in with `callbackUrl`. Bcrypt password hashing. `requireRole(role, locale)` guard at [src/lib/guards.ts](src/lib/guards.ts). `(authed)/` route group with shared header. Dashboard router at `/[locale]/dashboard` redirects by role.

UI primitives: `Input`, `Button`, `Label`, `FormError`, `FieldError` in `src/components/ui/`.

#### Sprint 3 — UN/LOCODE ports + forwarder lanes + port typeahead
Seeded 159 sea ports (`prisma/data/ports.json` + `prisma/seed-ports.ts`). Server action `searchPorts` ranked exact > prefix > contains. `<PortSelect>` debounced typeahead. Forwarder lanes page at `/forwarder/lanes` (add / toggle / delete).

#### Sprint 4 — Customer RFQ + forwarder quote inbox + quote submission
Customer RFQ form (origin / destination / container / weight / ready date / INCOTERM=FOB). Forwarder inbox `/forwarder/rfq` filtered by their declared lanes. Quote submission with price + transit days + carrier + validity. Customer shipment detail with ranked quotes (cheapest/fastest badges via `rankQuotes` at [src/lib/quotes.ts](src/lib/quotes.ts)).

#### Sprint 5 — Mock payment provider + dormant Stripe adapter
Introduced [src/lib/payments.ts](src/lib/payments.ts) with `paymentProvider()` + `isMock()`. Forwarder onboarding flow: mock = instant `onboardingComplete=true`, stripe = real Connect Express via [src/lib/stripe.ts](src/lib/stripe.ts) (lazy-imported). Quote-submission gated on `onboardingComplete`.

Stripe was attempted live — blocked by Stripe Connect cross-border restriction (UAE platform can't onboard Lebanon connected accounts). All Stripe code preserved; flag-flipped off.

#### Sprint 6 — Mock booking flow
`acceptQuoteAction` at [src/app/[locale]/(authed)/customer/shipments/[id]/actions.ts](src/app/[locale]/(authed)/customer/shipments/[id]/actions.ts). Single-transaction: create `Booking` + flip selected Quote → ACCEPTED + flip siblings → REJECTED + Shipment → BOOKED + initial TrackingEvent. Booking number generator at [src/lib/booking-numbers.ts](src/lib/booking-numbers.ts) — `GS-YYYY-XXXXXXXX` using Crockford alphabet (no `0/1/I/O`). Customer + forwarder booking list + detail pages.

Platform fee = `totalUSDCents × PLATFORM_COMMISSION_PERCENT / 100` (currently 7%).

#### Sprint 7 — Tracking stages + documents + email
Forwarder advances stages BOOKED → LOADED → DEPARTED → ARRIVED → CLEARED → DELIVERED via [src/app/[locale]/(authed)/forwarder/bookings/[id]/actions.ts](src/app/[locale]/(authed)/forwarder/bookings/[id]/actions.ts) — also updates `Shipment.status` (IN_TRANSIT / DELIVERED). Optional notes per stage.

**Storage abstraction** at [src/lib/storage.ts](src/lib/storage.ts):
- mock — writes to `.uploads/` on disk
- s3 — Cloudflare R2 / S3 via `@aws-sdk/client-s3`, 5-min presigned GET URLs

Document upload with type select (BL / Invoice / Packing list / Other), max 10MB, MIME-filtered. `/api/documents/[id]` route: auth gate, mock streams bytes, s3 redirects to signed URL.

**Email abstraction** at [src/lib/email.ts](src/lib/email.ts):
- mock — pretty-printed terminal log
- resend — Resend.com API (requires `RESEND_API_KEY`)

Templates: stage-changed, document-uploaded, booking-confirmed-to-forwarder. Wired into `acceptQuoteAction` + `advanceStageAction` + `uploadDocumentAction`.

#### Sprint 8 — Admin panel
`/admin` overview (4 cards: users / shipments / bookings / platform revenue). `/admin/users` paginated with search + role filter + suspend/unsuspend (Auth.js auto-rejects suspended users on sign-in). `/admin/shipments` filterable by status. `/admin/bookings` with gross volume + platform-revenue stats. Shared `<Pagination>` at [src/components/Pagination.tsx](src/components/Pagination.tsx).

#### Sprint 9 — i18n + RTL audit
Removed hardcoded English strings. Replaced legacy directional Tailwind utilities (`ml-`/`text-left`) with logical equivalents (`ms-`/`text-start`) — none found, already clean. **CSS-flip classes for arrows**: `.dir-arrow` renders `→` in LTR / `←` in RTL; `.dir-back` mirrors. Applied to 11 route-separator spans. EN/AR parity verified — same key set.

#### Sprint 10 — Vitest + Playwright + polish
31 unit tests in `src/lib/*.test.ts` (booking-numbers, quotes, money, validation, payments). 6 Playwright e2e in `tests-e2e/auth.spec.ts`. Stale `Sprint N` placeholder strings removed. Consolidated duplicate booking-number module. `npm test` / `npm run e2e` scripts.

### Phase 2 — Deferred features (sprints 11–onwards)

#### Sprint 11 — Coworker role
Added `COWORKER` to UserRole enum. New `CoworkerProfile` (displayName, countryCode, cityArea, serviceCenterLat/Lng, serviceRadiusKm, perKmRateUSDCents, baseFeeUSDCents, vehicleType, vehicleCapacityKg, stripeAccountId, onboarding flag, ratings). Sign-up form now has 4 role tabs (now 4 since Sprint 14 added customs). Coworker home + onboarding (mock-paid) at `/coworker` + `/coworker/onboarding`.

#### Sprint 12 — ExWorks RFQ flow + mock geocoder
Added `EXW` to Incoterm enum. New `Shipment` columns: `needsCustomsClearance`, `factoryAddressLine`, `factoryCity`, `factoryLat`, `factoryLng`, `pickupContactName`, `pickupContactPhone`. Customer RFQ form: incoterm toggle (FOB / ExWorks) with conditional pickup-detail block. First geocoder abstraction at [src/lib/geocoder.ts](src/lib/geocoder.ts) — mock searches the Port table by city name.

#### Sprint 12b — Leaflet map + Nominatim + OSRM
Replaced the simple CitySelect with a real map widget. [src/lib/geo.ts](src/lib/geo.ts) — pure Haversine + `nearestK`. [src/lib/maps.ts](src/lib/maps.ts) — 4 server actions: `searchPlaces` (Nominatim), `reverseGeocode` (Nominatim), `suggestNearestPorts` (Haversine over Port table), `getDrivingRoute` (OSRM with great-circle fallback).

`<FactoryMap>` component ([src/components/FactoryMap.tsx](src/components/FactoryMap.tsx) → [src/components/FactoryMapInner.tsx](src/components/FactoryMapInner.tsx)): `next/dynamic({ ssr: false })`. OSM tiles, click-to-pin, draggable factory marker, debounced Nominatim search with high z-index dropdown (`z-[1200]` to beat Leaflet's z-1000 controls). After origin port pick, OSRM polyline + km/min display.

#### Sprint 13 — Coworker quotes + multi-leg bookings
New `CoworkerQuote` (shipmentId + coworkerId unique, distanceKm computed, priceUSDCents, pickupTime, vehicleNote, notes, validUntil, status). New `Booking` columns: `pickupQuoteId` (unique), `coworkerId`, `pickupAmountUSDCents`.

Coworker RFQ inbox at `/coworker/rfq` — filtered by Haversine distance from coworker's service center to shipment's factory, within `serviceRadiusKm`. Pickup quote form with suggested price (`base + perKm × portDistance`).

`<MultiLegBookingForm>` at [src/app/[locale]/(authed)/customer/shipments/[id]/MultiLegBookingForm.tsx](src/app/[locale]/(authed)/customer/shipments/[id]/MultiLegBookingForm.tsx) — radio-card columns for freight + pickup. `acceptQuoteAction` extended to accept optional `pickupQuoteId`. Coworker bookings list + detail.

Helper at [src/lib/coworker-pricing.ts](src/lib/coworker-pricing.ts) — `suggestedPickupPriceCents` + `isWithinServiceRadius`.

#### Sprint 14 — Customs Agent role + per-booking clearance + 3rd leg
Added `CUSTOMS_AGENT` to UserRole. New `CustomsAgentProfile` (displayName, countryCode, optional licenseNumber, baseFeeUSDCents=15000, docSetFeeUSDCents=5000, stripeAccountId, onboarding flag, ratings). New `CustomsQuote` (shipmentId + customsAgentId unique, priceUSDCents, etaDays, notes, validUntil, status). New `Booking` columns: `customsQuoteId` (unique), `customsAgentId`, `customsAmountUSDCents`.

Customs agent at `/customs` — home, onboarding, RFQ inbox (filtered by `destinationPort.country === agent.countryCode` + `needsCustomsClearance=true`), RFQ detail with quote form, bookings list + detail.

`<MultiLegBookingForm>` now supports 1/2/3 columns dynamically (`lg:grid-cols-2/3`). `acceptQuoteAction` extended again — handles FOB, FOB+customs, EXW, EXW+customs combinations.

#### Sprint 15 — Reviews & ratings (mutual, post-delivery)
New `Review` model (bookingId, raterUserId, ratedUserId, ratedRole, score 1-5, optional comment). Unique on `(bookingId, raterUserId, ratedUserId)` — no double-reviewing.

Pure helpers at [src/lib/reviews.ts](src/lib/reviews.ts): `averageScore`, `appendToRunningAverage` (incremental — avoids re-aggregation on every write), `starsFilled`, `formatRating`. 8 Vitest tests.

`submitReviewAction` at [src/lib/reviews-actions.ts](src/lib/reviews-actions.ts) — validates booking is `DELIVERED`, rater is a party, rated is a different party, role matches. Transactionally writes Review + bumps target's profile `ratingAvg`/`ratingCount`.

`<RatingStars avg count />` ([src/components/RatingStars.tsx](src/components/RatingStars.tsx)) — read-only display. `<ReviewForm />` ([src/components/ReviewForm.tsx](src/components/ReviewForm.tsx)) — interactive 5-star picker. `<ReviewPanel />` ([src/components/ReviewPanel.tsx](src/components/ReviewPanel.tsx)) — orchestrator that shows "wait until delivered" before delivery and review forms / received-reviews after. Wired into all 4 booking detail pages.

Forwarder rating now visible on FOB quote-comparison cards via `<RatingStars size="sm">`.

#### Sprint 16 — In-platform chat per booking
One conversation per booking, lazily created on first message. Participants are implicit from the booking parties (customer + forwarder + optional coworker + optional customs agent). No polling in v1 — refresh-driven.

New models in [prisma/schema.prisma](prisma/schema.prisma): `Conversation` (1:1 with Booking), `Message` (sender + body + timestamp), `ConversationRead` (per-user `lastReadAt` pointer). Synced via `prisma db push --accept-data-loss`.

Server actions in [src/lib/chat.ts](src/lib/chat.ts):
- `sendMessageAction` — Zod-validated body (1-4000 chars), party check, transactional Message + `lastMessageAt` bump + sender read-pointer mark. Revalidates 4 booking detail paths + 4 list paths.
- `markConversationReadAction` — upserts ConversationRead. Revalidates 4 dashboard paths so the header badge updates.
- `getTotalUnread` — count of messages newer than user's `lastReadAt` across all bookings the user is a party to.

UI: [src/components/ChatPanel.tsx](src/components/ChatPanel.tsx) (server, loads + renders messages), [src/components/ChatComposer.tsx](src/components/ChatComposer.tsx) (client, `useActionState` + auto-reset), [src/components/MarkAsReadOnMount.tsx](src/components/MarkAsReadOnMount.tsx) (fires once on page mount), [src/components/UnreadBadge.tsx](src/components/UnreadBadge.tsx) (rose pill in the (authed) layout header). Wired into all 4 booking detail pages. `Chat` namespace added to EN + AR.

---

## Remaining sprints (planned, not built)

| # | Sprint | Status |
|---|---|---|
| 17 | Carrier pricing abstraction (CMA CGM + Freighty stubs, mock returns deterministic baseline rates) | pending |
| 18 | Vessel tracking mock + simple Leaflet map display + interpolated position during DEPARTED→ARRIVED | pending |
| 19 | Subscriptions for Coworker + Customs Agent (mock-paid, gates them from receiving bookings) | pending |
| 20 | Cargo insurance flat % + dispute resolution + final Vitest + polish | pending |

---

## Schema overview (Prisma)

Models:
- `User` + `Account` + `Session` + `VerificationToken` (Auth.js)
- `ForwarderProfile`, `CoworkerProfile`, `CustomsAgentProfile` (one per role-specific user)
- `Port` (159 seeded UN/LOCODEs)
- `Lane` (forwarder ↔ origin/destination)
- `Shipment` (with `incoterm`, optional EXW factory fields, `needsCustomsClearance`)
- `Quote` (sea freight)
- `CoworkerQuote` (pickup leg)
- `CustomsQuote` (customs leg)
- `Booking` (single-leg or multi-leg with optional `pickupQuoteId` / `customsQuoteId` refs)
- `TrackingEvent` (one row per stage transition)
- `Document` (BL / Invoice / Packing list / Other)
- `Review` (one per booking × rater × rated)
- `FxRate` (daily snapshot, not yet wired — Sprint 9-deferred)

Enums: `UserRole` (CUSTOMER / FORWARDER / COWORKER / CUSTOMS_AGENT / ADMIN), `Incoterm` (FOB / EXW), `ShipmentStatus`, `QuoteStatus`, `TrackingStage`, `ContainerType`, `DocumentType`.

VARCHAR lengths capped to fit MySQL 5.7's 1000-byte InnoDB key limit (see comments in schema).

---

## Dev quirks (read before troubleshooting)

1. **Use `next dev --webpack` not Turbopack.** Turbopack hits EPERM on Windows for this user on file renames. Hardcoded in `package.json scripts.dev`.

2. **Project lives at `C:\Users\user\projects\goship_app`** (NOT `C:\wamp64\www\goship_app`). Moved out of WAMP's www tree because Apache + AV process were locking `.next/` files during compile.

3. **MySQL is 5.7.26** despite folder being named `mysql8.0.27` under WAMP. Connect via `127.0.0.1:3306` (NOT localhost — mysql.exe defaults to port 3307 due to WAMP config). User `root`, no password.

4. **Migration generation is interactive on Prisma 6.** When schema changes generate warnings, `prisma migrate dev` blocks for input. Workarounds:
   - For dev iterations: `npx prisma db push --accept-data-loss` (bypasses migration files, syncs schema directly)
   - For production: re-baseline migrations via `prisma migrate dev --create-only` once in a TTY shell

5. **MySQL on Linux is case-sensitive for table names.** When generating migrations on Windows MySQL (lower_case_table_names=1), Prisma may emit `account` instead of `Account` in DROP INDEX statements. On Linux production these fail. Fix: `sed -i 's/`account`/`Account`/g' migration.sql` for each lowercased table name. See sprint.md history for the full sed.

6. **R2 bucket name is `business-digi`** (shared with another project). Files written to `bookings/<bookingId>/<uuid>.{pdf,png,jpg}`.

7. **Stripe Connect blocked**: UAE-registered platform can't onboard Lebanon/MENA accounts. Currently mock-everything. Long-term: re-register Stripe in US/UK, or swap to Tap Payments / Checkout.com / MyFatoorah for MENA.

8. **AGENTS.md / CLAUDE.md remind**: Next 16 has breaking changes. Async params on pages/layouts, `proxy.ts` not `middleware.ts`, Server Actions default to async.

---

## Production deploy (when ready)

Recommended: **Vercel + Vercel Postgres**. Workflow:
1. Set `provider = "postgresql"` in schema, strip MySQL-specific @db.VarChar caps
2. Re-baseline migrations: delete `prisma/migrations/`, run `npx prisma migrate dev --name init`
3. Add `prisma migrate deploy && prisma generate && next build` to package.json `build`
4. Connect Vercel to GitHub repo, provision Vercel Postgres in Storage tab
5. Paste env vars into Vercel dashboard (mirror local `.env` minus DATABASE_URL which Vercel auto-injects)
6. Push → auto-deploy

Pre-launch checklist (from session memory):
- Verify Resend sending domain (currently using `onboarding@resend.dev` rate-limited)
- Pick real payment provider (Stripe re-register OR MENA processor)
- Native Arabic translation review (current AR is machine-quality)
- Privacy policy + Terms (forwarder takes regulatory liability)
- Rate-limit sign-up + RFQ creation (Upstash Ratelimit)
- Sentry or equivalent error tracking
- DB backup policy
- Verify R2 bucket public access settings (currently signed-URL only via API)

---

## Commit history reference

- `deaec9f` — Initial commit: MVP sprints 1-10 + Phase 2 sprints 11-13

Subsequent work (Sprint 14+, Reviews) is uncommitted as of this writing.

---

## Files added in this conversation (since initial commit)

```
src/lib/reviews.ts                      Sprint 15 — pure rating aggregation
src/lib/reviews.test.ts                 Sprint 15 — 8 Vitest tests
src/lib/reviews-actions.ts              Sprint 15 — submitReviewAction
src/components/RatingStars.tsx          Sprint 15 — read-only star display
src/components/ReviewForm.tsx           Sprint 15 — interactive picker
src/components/ReviewPanel.tsx          Sprint 15 — booking-detail orchestrator

src/app/[locale]/(authed)/customs/                          Sprint 14 — entire role
  page.tsx                                                  Home with stats
  onboarding/page.tsx + actions.ts                          Mock-paid onboarding
  rfq/page.tsx                                              RFQ inbox (filtered by country)
  rfq/[id]/page.tsx + actions.ts + CustomsQuoteForm.tsx     Quote submit
  bookings/page.tsx + [id]/page.tsx                         Won clearances

prisma/schema.prisma                    Sprint 14+15 — CustomsAgentProfile, CustomsQuote, Review,
                                        Booking customs* columns + Shipment.needsCustomsClearance
```

Plus extensions to the multi-leg booking form, customer RFQ form, all 4 booking detail pages, admin pages, sign-up form, validation library, dev seeder, and translation files for the Customs + Reviews namespaces.

---

## Open thread

The user paused on Sprint 16 to commit this state to GitHub and create this hand-off doc. Next planned step: **Sprint 16 — in-platform chat per booking** (text-only, one conversation per booking, poll on page load, unread badge in header).
