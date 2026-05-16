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

#### Sprint 17 — Carrier pricing abstraction
Provider-flag pattern (mock | cmacgm | freighty) for baseline rate lookups. Mock returns a deterministic anchor rate per lane+container so forwarders see suggested pricing instead of bidding blind on day one.

[src/lib/carrier-pricing.ts](src/lib/carrier-pricing.ts) — `getBaselineRate({ origin, destination, containerType })` dispatches by `CARRIER_PRICING_PROVIDER`. Mock uses `haversineKm` × per-km cents × container multiplier (LCL 0.35 / 20ft 1.0 / 40ft 1.6 / 40HC 1.72), floors transit at 7 days, and picks a stable carrier brand via lane-string hash. CMA CGM and Freighty stubs throw explicit "not yet wired" errors so flipping the env var without keys is loud, not silent. 8 Vitest tests for determinism, container ordering, transit floor, and source tagging.

[src/app/[locale]/(authed)/forwarder/rfq/[id]/page.tsx](src/app/[locale]/(authed)/forwarder/rfq/[id]/page.tsx) — fetches `getBaselineRate(...)` server-side (wrapped in `.catch(() => null)` so a stub-flag misfire degrades to no panel, not a crashed page) and renders a sky-50 baseline panel above the quote form: `"Around $X, Y transit days via Hapag-Lloyd. We've pre-filled your form — adjust to win the bid."` Defaults are passed into `QuoteForm` to pre-populate price/transit/carrier inputs. `Rfq.baselineTitle/Body/Source` added to EN + AR. `CARRIER_PRICING_PROVIDER=mock` added to `.env.example`.

#### Sprint 18 — Vessel tracking mock + map display
Provider-flag pattern (mock | marinetraffic | ais) for vessel positions. Mock interpolates the ship's lat/lng along the great-circle arc using the fraction of transit days elapsed since the `DEPARTED` tracking event.

[src/lib/vessel-tracking.ts](src/lib/vessel-tracking.ts) — `getVesselPosition({origin, destination, events, transitDays})`. `interpolateGreatCircle` does proper slerp on the unit sphere (so trans-Pacific lanes curve north correctly instead of looking like a rhumb line). Returns null before DEPARTED, snaps to destination on ARRIVED, returns null after CLEARED/DELIVERED (cargo no longer on a vessel). Real providers stub-throw. 11 Vitest tests covering endpoints, clamping, missing coords, stage gating, and slerp midpoint.

UI: [src/components/VesselMap.tsx](src/components/VesselMap.tsx) (`next/dynamic({ ssr: false })` wrapper) + [VesselMapInner.tsx](src/components/VesselMapInner.tsx) — react-leaflet map with origin/destination port markers (teal pins), great-circle route as 64-segment dashed polyline, blue anchor pin at vessel position with permanent "{X}% en route" tooltip. Auto-fits bounds to all three points with 0.2 padding.

Wired into [customer/bookings/[id]/page.tsx](src/app/[locale]/(authed)/customer/bookings/[id]/page.tsx) and [forwarder/bookings/[id]/page.tsx](src/app/[locale]/(authed)/forwarder/bookings/[id]/page.tsx) — page query extended to select port `lat`/`lng`, `getVesselPosition(...)` called server-side (`.catch(() => null)` for stub safety), map renders below tracking timeline only when DEPARTED-but-not-CLEARED. ETA hint shows projected arrival date.

`Booking.vesselPositionTitle/Hint` added EN + AR. `VESSEL_TRACKING_PROVIDER=mock` added to `.env.example`.

#### Sprint 19 — Subscriptions for Coworker + Customs Agent (mock-paid)
Monthly subscription gates Coworker + Customs Agent quote submission. Forwarders are NOT gated (they pay platform commission per booking). Provider flag `SUBSCRIPTION_PROVIDER=mock|stripe`. Mock = one-click 30-day activation.

**Schema** ([prisma/schema.prisma](prisma/schema.prisma)) — new `Subscription` model (`userId`, `role`, `tierName`, `priceUSDCents`, `currentPeriodStart/End`, `status`, `provider`, `providerSubscriptionId`, `cancelledAt`) + `SubscriptionStatus` enum (ACTIVE/EXPIRED/CANCELLED). `@@index([userId, status])` for the hot-path "active sub for user" lookup. Synced via `db push`.

**Pure module** ([src/lib/subscriptions.ts](src/lib/subscriptions.ts)) — `TIERS.COWORKER` ($29/mo) + `TIERS.CUSTOMS_AGENT` ($49/mo), `tierForRole`, `isPeriodActive` (half-open [start, end), checks ACTIVE status), `nextPeriodEnd`, `daysRemaining`. 10 Vitest tests covering role gating, period boundaries, expired/cancelled rejection, day math.

**Server actions** ([src/lib/subscriptions-actions.ts](src/lib/subscriptions-actions.ts)) — `getActiveSubscriptionForUser` (lazy expires past-end ACTIVE rows on read — no daily cron needed), `hasActiveSubscription`, `subscribeAction` (mock = create row with `nextPeriodEnd(now, 30)`, stripe = stub-error), `cancelSubscriptionAction`. Both revalidate `/coworker` + `/customs` roots + `/subscription` + `/rfq` paths.

**Gates added** in both quote action files ([coworker/rfq/[id]/actions.ts](src/app/[locale]/(authed)/coworker/rfq/[id]/actions.ts) + [customs/rfq/[id]/actions.ts](src/app/[locale]/(authed)/customs/rfq/[id]/actions.ts)) — after onboarding check, refuse with `error: "subscription"` if not subscribed. Form components show `errSubscription` translation.

**UI** — `<SubscribePanel>` + `<CancelSubscriptionForm>` ([src/components/SubscriptionPanel.tsx](src/components/SubscriptionPanel.tsx)) with `confirm()` dialog. Pages: [coworker/subscription/page.tsx](src/app/[locale]/(authed)/coworker/subscription/page.tsx) + [customs/subscription/page.tsx](src/app/[locale]/(authed)/customs/subscription/page.tsx) show active state (emerald, "Renews on {date} — {days} remaining") or subscribe form. Home pages + RFQ inbox + RFQ detail pages all show rose "activate your membership" banner/inline-block when missing. `Subscription` namespace added EN + AR. `SUBSCRIPTION_PROVIDER=mock` added to `.env.example`.

**Note on session.user.role typing** — Auth.js v5 declares `session.user.role: string` in [next-auth.d.ts](src/types/next-auth.d.ts). Cast `as UserRole` at the boundary in `subscribeAction` since the JWT was minted from a known enum at sign-in.

#### Sprint 20 — Cargo insurance + disputes + final polish
Closes out the Phase-2 build. Three concerns: optional marine cargo insurance, a customer/forwarder dispute channel with admin resolution, and a final typecheck/test sweep.

**Cargo insurance** — flat-rate cover on top of freight + pickup + customs. Configurable via `INSURANCE_RATE_BPS` (default 150 bps = 1.5%). Customer opts in at RFQ creation with a declared cargo value; premium snapshots onto the Booking at acceptance.
- Schema: `Shipment.wantsInsurance` + `Shipment.cargoValueUSDCents`, `Booking.insuranceUSDCents` (default 0) + `Booking.cargoValueUSDCents`.
- Pure module [src/lib/insurance.ts](src/lib/insurance.ts) — `computeInsuranceCents(wants, value, bps)` rounds UP so the platform never undercharges; `formatRatePercent` for disclosure copy. **7 Vitest tests**.
- RFQ form ([NewShipmentForm.tsx](src/app/[locale]/(authed)/customer/shipments/new/NewShipmentForm.tsx)) adds an "Add cargo insurance" checkbox that reveals a `cargoValueUSD` input. `createShipmentAction` extends its Zod input + persists.
- `acceptQuoteAction` computes `insuranceCents` and adds it to `totalUSDCents` before commission calc, storing the snapshot on the booking. Customer booking detail page shows an emerald "Insured · {premium} insurance premium (1.5% of {value})" line. EN + AR translations under `Insurance`.

**Disputes** — out-of-band admin resolution model. Customer OR forwarder can open ONE dispute per booking; admin marks RESOLVED or REJECTED with a public note both parties see. Coworker / customs agent cannot raise — narrower contract, escalate via forwarder.
- Schema: `Dispute` model (`bookingId`, `openedByUserId`, `reason`, `description`, `status`, `adminNote`, `resolvedAt`) + `DisputeStatus` + `DisputeReason` enums. `@@index([bookingId])` + `@@index([status])`.
- Server actions [src/lib/disputes.ts](src/lib/disputes.ts) — `openDisputeAction` (party check + one-OPEN-per-booking lock), `resolveDisputeAction` (admin-only).
- UI: [DisputePanel.tsx](src/components/DisputePanel.tsx) (server, lists existing + renders form) + [DisputeForm.tsx](src/components/DisputeForm.tsx) (client toggle-then-form with reason dropdown + 10–4000-char description). Wired into both customer + forwarder booking detail pages.
- Admin: [admin/disputes/page.tsx](src/app/[locale]/(authed)/admin/disputes/page.tsx) with OPEN/RESOLVED/REJECTED tab filter + inline `<ResolveDisputeForm>` (single textarea, two submit buttons: "Mark RESOLVED" / "Mark REJECTED" via `name="resolution"`). Admin overview page now shows "Open disputes ({count})" quick-link.
- EN + AR translations under `Dispute` namespace.

**Final polish** — `npx tsc --noEmit` clean, `npx vitest run` 91/91. `INSURANCE_RATE_BPS=150` added to `.env.example`.

---

## Sprint log complete

All 20 sprints landed end-to-end:
1. **Sprints 1–10** (initial commit `deaec9f`): Foundation, Auth + roles, Ports + lanes, RFQ + quotes, Stripe Connect onboarding (mock), Booking + payment, Tracking + documents, Admin minimal, i18n + Arabic RTL, E2E + polish.
2. **Sprints 11–15** (post-`deaec9f`): Coworker role, ExWorks RFQ flow, Leaflet maps + Nominatim + OSRM, Coworker quotes + multi-leg bookings, Customs Agent role, Reviews & ratings.
3. **Sprints 16–20**: Chat, Carrier-pricing abstraction, Vessel tracking, Subscriptions, Cargo insurance + Disputes.

**Test suite**: 91 Vitest tests across 12 files. Provider-flag pattern lets every external dep (`PAYMENT`, `EMAIL`, `STORAGE`, `MAP`, `CARRIER_PRICING`, `VESSEL_TRACKING`, `SUBSCRIPTION`) run in `mock` mode for offline dev.

**Pre-launch checklist** (unchanged from earlier, plus): verify `INSURANCE_RATE_BPS` matches whichever underwriter the platform partners with; legal review of dispute T&Cs.

#### Sprint 21 — Notifications hub (pre-design polish)
Cross-cutting in-app notification system so designers know what event types exist before mocking the header / inbox / empty states.

**Architecture: fan-out at write time.** When something happens, we insert N rows (one per recipient) so the inbox query stays a single indexed `findMany`. No fan-in at read time, no queue/worker (Sprint 24+ if scale demands).

**Schema** ([prisma/schema.prisma](prisma/schema.prisma)) — new `Notification` model: `userId`, `type` (NotificationType enum), optional `bookingId`/`shipmentId`/`bodyText`/`linkPath`, `readAt`. `@@index([userId, readAt])` for the bell count (`readAt IS NULL`); `@@index([userId, createdAt])` for the page list. Synced via `db push`.

8 notification types covering the events that aren't already surfaced elsewhere — chat unread stays in `ConversationRead` (no `NEW_MESSAGE` type, deliberate; would double-count):
- `NEW_RFQ_ON_LANE` — fwd inbox
- `NEW_QUOTE_RECEIVED` — customer received a forwarder/coworker/customs bid
- `QUOTE_ACCEPTED` — winner's notification (fan-out to forwarder + coworker? + customs?)
- `BOOKING_STAGE_ADVANCED`, `DOCUMENT_UPLOADED` — customer on stage/doc changes
- `DISPUTE_OPENED`, `DISPUTE_RESOLVED` — both parties
- `REVIEW_RECEIVED` — rated user

**Module split**:
- [src/lib/notifications.ts](src/lib/notifications.ts) — pure helpers: `createNotification` / `createNotifications` (batch via `createMany skipDuplicates`, swallows DB errors with `console.error` so notification failures never break the parent action), `getUnreadNotificationCount`, `listNotificationsForUser`.
- [src/lib/notifications-actions.ts](src/lib/notifications-actions.ts) — `"use server"` actions: `markNotificationReadAction` (caller-owned only), `markAllNotificationsReadAction`. Both revalidate `/notifications` + the 5 role roots so the bell badge clears.

**Wired into 7 existing actions** — each one stays a single function (no per-action notification middleware). Imports `createNotification`/`createNotifications` and fires after the main DB write succeeds:
- `createShipmentAction` → fan-out to every forwarder with a matching active lane
- `submitQuoteAction` (forwarder + coworker + customs) → notify the customer
- `acceptQuoteAction` → notify winning forwarder + optional coworker + optional customs
- `advanceStageAction` → notify customer
- `uploadDocumentAction` → notify customer
- `openDisputeAction` → notify the other booking party
- `resolveDisputeAction` → notify both customer + forwarder
- `submitReviewAction` → notify the rated user

**UI**:
- [NotificationBell.tsx](src/components/NotificationBell.tsx) — server component, SVG bell icon + rose badge with unread count (capped at "99+"). Wired into [(authed)/layout.tsx](src/app/[locale]/(authed)/layout.tsx) header beside the chat `UnreadBadge`. Both badges have distinct semantics — chat = unread DM messages, bell = everything else.
- [(authed)/notifications/page.tsx](src/app/[locale]/(authed)/notifications/page.tsx) — list of last 50 with sky-50 unread highlight, clickable `<Link>` to `linkPath` if present, "Mark all read" button + auto-mark-all-on-mount client component (`MarkAllReadOnMount`, same pattern as `ChatPanel`'s `MarkAsReadOnMount` — visiting the page = "I've seen them"). Bell badge clears via revalidatePath fan-out.

`Notifications` namespace added to EN + AR. No new env vars.

**Why before design**: bell placement, badge styling, notification-row anatomy, empty-state copy all need a designer's eye now that the event surface is defined. Right now everything's functional but visually minimal — that's by design (Sprint 22+ pre-design polish, design pass picks up from here).

#### Sprint 22 — Multi-currency display
The `FxRate` table from Sprint 9 finally gets wired. Display-only: USD remains the canonical settlement currency (every Money column is USD cents; Stripe/Connect transact in USD). Each user picks a display currency; the app converts at render time using the latest snapshot.

**No FX risk for the platform** — conversion is purely cosmetic. A rate change between page load and payment doesn't move the dollar amount being charged.

**Schema** — `User.preferredCurrency String @default("USD") @db.VarChar(3)`. Synced via `db push`.

**Pure module** [src/lib/fx.ts](src/lib/fx.ts):
- `convertFromUSDCents(amountUSDCents, usdPerTarget)` — divides + rounds. Returns source amount unchanged for invalid rates (graceful no-op).
- `formatMoney(minorUnits, currency, locale)` — `Intl.NumberFormat` with style `"currency"`, so JPY auto-drops decimals, USD gets `$`, EUR gets `€`. Fallback string for unknown codes.
- `SUPPORTED_CURRENCIES` whitelist: USD, EUR, GBP, AED, SAR, LBP, EGP, JOD, CNY, JPY. Adding more is a one-line change.
- `getLatestRate(currency)` — single-row DB lookup; returns 1 for USD or missing rate (renders unchanged USD amount).
- **10 Vitest tests** covering conversion edge cases (zero, NaN, large multipliers for LBP, Intl currency formatting, JPY no-decimals, supported-currency typeguard).

**Rate sourcing** [src/lib/fx-fetch.ts](src/lib/fx-fetch.ts):
- `fetchAndPersistFxRates()` hits exchangerate.host (free, no API key) for base=USD + every supported currency, INVERTS to "USD per 1 target", upserts a row per currency for today's date.
- Idempotent via PK `(date, currency)` — safe to re-run.
- Surfaces fetch errors; caller (cron route / script) decides retry.

**Triggers**:
- `npm run seed:fx` ([prisma/seed-fx.ts](prisma/seed-fx.ts)) — one-shot.
- `GET /api/cron/fx-rates` ([src/app/api/cron/fx-rates/route.ts](src/app/api/cron/fx-rates/route.ts)) — daily cron. Auth via Vercel's `Authorization: Bearer $CRON_SECRET` header OR `?key=` query. For Vercel, add to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/fx-rates", "schedule": "0 6 * * *" }] }
  ```

**UI**:
- [`<MoneyAmount>`](src/components/MoneyAmount.tsx) — server component. Reads session → user's `preferredCurrency` → `getLatestRate` → renders. `showUSDAside` prop appends "(\$X.XX)" so settlement amount stays visible on totals. Falls back to USD if rate is missing or currency unsupported.
- Swapped `formatUSD` → `<MoneyAmount>` in the three highest-visibility customer surfaces: [customer/bookings/[id]/page.tsx](src/app/[locale]/(authed)/customer/bookings/[id]/page.tsx) total-paid header, [customer/shipments/[id]/page.tsx](src/app/[locale]/(authed)/customer/shipments/[id]/page.tsx) quote-comparison cards + total summary, [customer/bookings/page.tsx](src/app/[locale]/(authed)/customer/bookings/page.tsx) list. Forwarder/coworker/customs/admin pages keep raw USD — settlement-side actors should see settlement currency.
- `/settings` page at [src/app/[locale]/(authed)/settings/](src/app/[locale]/(authed)/settings/page.tsx) — currency dropdown wired to `updatePreferredCurrencyAction`. Action revalidates all 5 role roots so the new currency takes effect without a hard reload.
- Settings cog icon added to the (authed) layout header.

**Translations** — `Settings` namespace EN + AR. No new error states (FX failures degrade to USD silently).

**Env** — `CRON_SECRET` added to `.env.example` with `crypto.randomBytes(32)` generator hint.

**Note on the FxRate PK** — composite `(date, currency)` was already in the schema. The upsert uses Prisma's `where: { date_currency: { ... } }` compound-key syntax. No migration needed.

#### Sprint 23 — Public provider directory
Public-facing pages so a prospective customer can browse forwarders, coworkers, and customs agents **before signing up**. No auth required.

**Routes** — nested under `/providers/` with a shared layout providing a public header + 3-tab nav (forwarders / coworkers / customs):
- [/providers/forwarders](src/app/[locale]/providers/forwarders/page.tsx) — list. Filter by origin + destination UN/LOCODE (lane match via secondary `db.lane.findMany` filter — cleaner than a clunky relational query). Sort by `ratingAvg` desc → `ratingCount` desc.
- [/providers/forwarders/[id]](src/app/[locale]/providers/forwarders/[id]/page.tsx) — detail. Stat cards (completed bookings, active lanes, rating), full list of active lanes with transit days, sign-up CTA.
- [/providers/coworkers](src/app/[locale]/providers/coworkers/page.tsx) + [/providers/coworkers/[id]](src/app/[locale]/providers/coworkers/[id]/page.tsx) — country filter. Detail shows vehicle / capacity / per-km rate.
- [/providers/customs](src/app/[locale]/providers/customs/page.tsx) + [/providers/customs/[id]](src/app/[locale]/providers/customs/[id]/page.tsx) — country filter. Detail shows license number, base + doc-set fees, operating cities.

**Visibility rules** — both list + detail filter `onboardingComplete: true` AND `user.suspended: false`. Suspended or not-onboarded providers 404 on direct URL — admin-suspended state must not leak.

**Trust signals** — every detail page does a `db.booking.count` for completed (DELIVERED-stage) bookings/pickups/clearances for that user. Cheap, single indexed query.

**Layout** [src/app/[locale]/providers/layout.tsx](src/app/[locale]/providers/layout.tsx) — public header (brand, Sign in / Sign up, or Dashboard if already authed) + tab strip. `aria-current="page"` styling on the active tab uses Tailwind 4's `aria-[current=page]:` modifier.

**Cross-links**:
- Marketing landing page ([src/app/[locale]/page.tsx](src/app/[locale]/page.tsx)) — "Or browse our forwarders, pickup coworkers, and customs agents →" link below the role CTAs.
- Customer's quote-comparison cards ([customer/shipments/[id]/page.tsx](src/app/[locale]/(authed)/customer/shipments/[id]/page.tsx)) — forwarder name on each pending quote is now a `<Link>` to `/providers/forwarders/[id]`, opening the same public profile in a new context.

`Providers` namespace added EN + AR (40+ keys for empty states, filter labels, stat labels, CTAs).

**Design-handoff value** — gives designers a *third* class of UI page to lay out (next to authed dashboards and marketing landing): the **directory/profile pattern**. Three near-identical pages now exist with the same anatomy (filter bar, card grid, detail w/ stats + lists + CTA) — perfect raw material for a designer to pick a consistent treatment that the rest of the app inherits.

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
- `Conversation` + `Message` + `ConversationRead` (Sprint 16 chat)
- `Subscription` (Sprint 19 monthly membership for COWORKER + CUSTOMS_AGENT)
- `Dispute` (Sprint 20 customer/forwarder-raised disputes, admin-resolved)
- `Notification` (Sprint 21 in-app notifications, fan-out at write time)
- `FxRate` (daily snapshot, not yet wired — Sprint 9-deferred)

Enums: `UserRole` (CUSTOMER / FORWARDER / COWORKER / CUSTOMS_AGENT / ADMIN), `Incoterm` (FOB / EXW), `ShipmentStatus`, `QuoteStatus`, `TrackingStage`, `ContainerType`, `DocumentType`, `SubscriptionStatus`, `DisputeStatus`, `DisputeReason`, `NotificationType`.

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
