# Vibenasi Roadmap

Development milestones for Vibenasi (formerly Techet) — a coastal Kenya events, ticketing, and vibe-discovery platform.

Status legend: ✅ shipped · 🔨 in progress · 📋 planned

## Milestone 1 — Ticketing MVP ✅

- ✅ Next.js foundation, Prisma schema, credentials auth with roles (user / organizer / admin)
- ✅ Event management: create, edit, publish, moderate
- ✅ Ticket types, checkout, and order flow
- ✅ M-Pesa STK push payments with callback handling
- ✅ Digital tickets with QR check-in (camera scanner + manual code entry)
- ✅ Organizer dashboard, earnings, and payout requests
- ✅ Admin panel: event moderation and payout approval
- ✅ External ticket links for events sold on other platforms

## Milestone 2 — Vibenasi pivot ✅

- ✅ Mood-based discovery feed for places and events (`/discover`)
- ✅ Weekend planner: generated 2-day itinerary from location, budget, mood, group size, transport (`/plan`)
- ✅ Crew plans: voting, checklists, cost splitting, join-by-code
- ✅ Vibe map and sunset index (`/map`)
- ✅ Artist profiles, category browsing, and booking requests (`/artists`)
- ✅ User profile page
- ✅ Lightweight analytics tracking via audit log
- ✅ Geolocation-based discovery ranking for places: opt-in "Near me" button, proximity boost, distance badges

## Milestone 3 — Hardening & engagement 📋

Priorities for the next phase, roughly in order:

1. ✅ **Notifications** — email confirmations for orders, artist booking requests, and crew-plan joins (via Resend; logs to console in dev when unconfigured)
2. 📋 **Artist booking payments** — connect accepted bookings to the M-Pesa checkout flow with deposits
3. 📋 **Test suite** — unit tests for `src/lib/` ranking, planning, and payout logic; integration tests for checkout
4. ✅ **Middleware → proxy migration** — renamed `src/middleware.ts` to `src/proxy.ts` per the Next.js 16 convention
5. 📋 **Venue coordinates** — add lat/lng to venues so events can join the distance-aware ranking

## Milestone 4 — Growth 📋

Ideas, not yet committed to:

- 📋 Social sharing cards for itineraries and events
- 📋 Organizer analytics dashboard (views, conversion, revenue trends)
- 📋 Artist reviews and ratings
- 📋 Push notifications / PWA install
- 📋 Multi-city expansion beyond Mombasa, Diani, and Watamu

## Working agreements

- Update this file when a milestone item ships or priorities change.
- Record shipped changes in `CHANGELOG.md`.
- `npm run build` and `npm run lint` must pass before every commit.
