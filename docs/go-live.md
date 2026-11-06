# Go-live checklist

Everything needed to take Vibenasi from local dev to a revenue-generating production deployment.

## How the platform makes money

| Stream | Mechanism | Lever |
| --- | --- | --- |
| Ticket sales | Platform keeps a % of every paid order; the rest is owed to the organizer (see `/admin/payouts`) | `PLATFORM_FEE_PCT` (default 10) |
| Artist booking deposits | Accepted bookings collect an M-Pesa deposit; the platform keeps the fee, the artist earns the rest | `BOOKING_DEPOSIT_PCT` (default 30) × `PLATFORM_FEE_PCT` |

Both streams settle into your M-Pesa shortcode (Paybill or Till). Organizer payouts and artist
deposit payouts are manual for now — track balances in `/admin/payouts` and the artist dashboard.

## 1. Hosting

- [ ] Deploy to a Node host (Vercel is the lowest-friction choice for Next.js).
- [ ] Set the production domain and point `APP_URL` at it (e.g. `https://vibenasi.app`).
- [ ] Confirm `postinstall` runs `prisma generate` on the build machine (it's already in `package.json`).
- [ ] Run `npx prisma migrate deploy` against the production database on each release.

## 2. Database

- [ ] Use a production Prisma Postgres (or any hosted Postgres) instance — not the dev database.
- [ ] Set `DATABASE_URL` in the host's environment (never commit it).
- [ ] Seed moods/places with `npm run db:seed` once, then create real content via the app.
- [ ] Enable automated backups on the database plan.

## 3. M-Pesa (Daraja) production credentials

- [ ] Register the business on [Safaricom Daraja](https://developer.safaricom.co.ke/) and complete the **Go Live** process for Lipa na M-Pesa Online (STK push).
- [ ] Set `MPESA_ENV=production` (`mock` is rejected in production builds; `sandbox` only pays test money).
- [ ] Set `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` from the production app.
- [ ] Paybill: `MPESA_SHORTCODE=<paybill>` and the production `MPESA_PASSKEY`.
- [ ] Till (Buy Goods) instead: also set `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and `MPESA_PARTY_B=<till number>`; `MPESA_SHORTCODE` is then the store number.
- [ ] Set `MPESA_CALLBACK_URL=https://<your-domain>/api/mpesa/callback` (must be public HTTPS).
- [ ] Generate a long random `MPESA_CALLBACK_SECRET` — it authenticates callbacks via the `?token=` query parameter.
- [ ] Charge a real KES 1 ticket end-to-end before announcing anything.

## 4. Email (Resend)

- [ ] Verify your sending domain in [Resend](https://resend.com) and set `RESEND_API_KEY`.
- [ ] Set `EMAIL_FROM` to an address on the verified domain, e.g. `Vibenasi <no-reply@vibenasi.app>`.
- [ ] Unset/blank `RESEND_API_KEY` only in dev (emails then log to the console).

## 5. Auth & admin

- [ ] Generate a fresh production `AUTH_SECRET` (`npx auth secret`), different from dev.
- [ ] Create your account through `/register`, then promote it: `node make-admin.mjs <email>`.
- [ ] Admins moderate events at `/admin/events` and record payouts at `/admin/payouts`.

## 6. Pre-flight

- [ ] `npm test`, `npm run lint`, and `npm run build` all pass.
- [ ] `npm audit` reviewed — upgrade or accept each finding deliberately.
- [ ] `PLATFORM_FEE_PCT` and `BOOKING_DEPOSIT_PCT` set to the rates you actually want to charge.
- [ ] No secrets in the repo — everything sensitive lives in the host's environment settings.

## 7. Post-deploy smoke test

- [ ] Register, log in, and browse `/events` and `/discover`.
- [ ] Buy a cheap real ticket with M-Pesa; confirm the QR ticket appears and the email arrives.
- [ ] Check the QR code in with the organizer scanner (`/dashboard/events/<id>/checkin`).
- [ ] Send an artist booking request, accept it as the artist, and pay the deposit from `/bookings`.
- [ ] Verify organizer earnings on `/dashboard/earnings` and the admin payout view reflect the sale.

## Ongoing operations

- Pay organizers their balances regularly (M-Pesa B2C or bank) and record each payout in `/admin/payouts`.
- Pay artists their deposit share (deposit − platform fee) after events happen; the artist dashboard shows what's owed.
- Watch `AuditLog` (analytics events) for conversion drop-offs.
- Reconcile M-Pesa statements against `Payment` / `BookingPayment` rows monthly.
