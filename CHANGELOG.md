# Changelog

All notable changes to this project will be recorded in this file.

The format is based on Keep a Changelog, and this project follows a simple versioning approach during early development.

## [Unreleased]

### Added
- Artist booking deposits via M-Pesa: requesters pay a configurable deposit (`BOOKING_DEPOSIT_PCT`, default 30%) on accepted bookings; the platform keeps `PLATFORM_FEE_PCT` (default 10%) of each deposit. New `BookingPayment` model, `CONFIRMED` booking status, pay-deposit flow on `/bookings`, deposit earnings on the artist dashboard, and confirmation emails to both sides.
- Venue coordinates: organizers can add lat/lng to venues, and events now join the distance-aware "Near me" ranking in Discover with distance badges.
- Test suite (Vitest, `npm test`): unit tests for deposit math, discovery ranking, weekend planning, and phone normalization; integration tests for checkout, the M-Pesa callback (tickets + deposits), and the deposit endpoint.
- Email notifications via Resend: order confirmations, artist booking request created/accepted/declined/cancelled, and crew-plan join alerts. No-op console log in development when `RESEND_API_KEY` is unset.
- Vibenasi pivot: mood-based discovery feed for places and events
- Weekend planner that generates a 2-day itinerary from location, budget, mood, group size, and transport
- Crew plans with voting, checklists, cost splitting, and join-by-code
- Vibe map and sunset index surfaces
- Artist profiles, category browsing, and artist booking requests
- User profile page and lightweight analytics tracking via audit log
- Geolocation-based discovery ranking: opt-in "Near me" button, proximity boost for nearby places, distance badges
- Initial project direction for Techet
- Focused README with MVP scope
- Core product goals and development rules

### Changed
- Rebranded the app package from Techet to Vibenasi
- Refined the original concept into a clearer implementation template

### Planned
- Project structure
- Environment configuration example
- Application foundation
- Authentication and roles
- Event and ticket management
- Booking flow
- Payment integration
- Digital tickets with QR validation

## Notes

This file should be updated whenever a meaningful change is made to the project.
