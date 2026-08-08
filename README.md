# Door in Four (Monorepo) - Buyer-Led Collection & Delivery MVP

Production-focused MVP for a buyer-led local collection and delivery service. Tunbridge Wells pilot launch ready.

## Release candidate (branch `fix/four-blockers-schema-auth-booking-tests`)

Full audit: **`RELEASE_CANDIDATE_AUDIT.md`**. Deploy notes: **`DEPLOYMENT.md`**.

- Migrations through **`006_release_candidate_ops_and_storage.sql`**
- Admin route auth (list/notes/disputes/audit + middleware page gate)
- Driver mobile: real progress API + **Supabase Storage** proof upload
- Driver payout **75%** canonical; strict lifecycle (no status skips)
- **Do not merge to main** until pilot sign-off

## Monorepo Audit (what works now)

**Structure (clean & testable):**
- `apps/admin` (Next.js @ port 3001): Main pilot control room dashboard. Routes: /bookings (list + status/payment/proof/payout), /dispatch, /operations (driver assign), /quotes, /get-a-quote. APIs for all workflow steps.
- `apps/seller` (Next.js @ port 3002): Secure seller links + buyer flows. /sell (create token link for shop owners - simple UI), /buy, /buyer/[token], /checkout, /quote, /track. Plain language buyer walkthrough in buy flow.
- `apps/mobile` (Expo RN): Driver + buyer mobile screens (jobs, earnings, proof photos, onboarding).
- `packages/config`: Zod env validation for all apps.
- `packages/types`: BookingStatus, PaymentStatus, ItemSize, schemas.
- `packages/shared`: Workflow guards (isStatusTransitionAllowed, canDispatch, canPayQuote, canSetPayoutReady, verifyHandover/Delivery, clean* sanitizers), security.
- `packages/pricing`: calculateQuote engine + tests.
- `packages/db`: Migrations (init, hardening, constraints, pickup email) + idempotent seed with Tunbridge Wells data.
- `packages/ui`: Basic components.

**What works:**
- Full happy path: quote create/accept -> payment intent -> Stripe webhook paid transition -> admin dispatch/assign driver -> driver progress/proof (code+photo) -> completed -> payout_ready.
- Type-safe with Zod + TS.
- pnpm workspaces with corepack pinned.
- Supabase + Stripe integration (webhooks, Connect payouts path described).
- Seeded launch data for Kent towns.
- Tests in pricing + shared (workflow guards).

**Current limitations (documented for James):**
- Mobile is Expo scaffold (full e2e needs device/CI farm).
- No real money movement yet (test mode Stripe).
- Pilot scope: Tunbridge Wells + fringe only.
- Seller app serves dual seller/buyer UI (future split possible).
- Some packages use echo for build (non-critical libs).

## Exact Local Setup (run these in order)

```bash
# 1. Pull latest
git pull origin main

# 2. Corepack + pnpm@9.15.4
corepack enable
corepack prepare pnpm@9.15.4 --activate

# 3. Install (pnpm first, npm fallback if needed)
pnpm install
# or: npm run install:npm-fallback

# 4. Checks (must all succeed)
pnpm typecheck
pnpm test
pnpm build

# 5. Launch checklist command
pnpm launch:checklist

# 6. Seed Tunbridge Wells data (includes towns, users, sample bookings)
pnpm db:seed

# 7. Supabase: apply migrations manually in SQL editor if not done (see packages/db/migrations/)

# 8. Stripe setup
# - Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET to env files
# - stripe login && stripe listen --forward-to localhost:3001/api/webhooks/stripe
# - Use test card 4242 4242 4242 4242
```

## Run the apps

```bash
# Admin pilot control room (main dashboard)
pnpm dev:admin   # http://localhost:3001  -> /bookings, /dispatch, /operations

# Seller (shop owner secure links + buyer entry)
pnpm dev:seller  # http://localhost:3002  -> /sell (create link), /buy (buyer walkthrough)

# Mobile (driver/buyer)
pnpm dev:mobile
```

## Buyer-led flow (plain language walkthrough for buyer)
1. Get quote: Enter pickup/delivery towns/postcodes, item details, urgency -> instant price breakdown.
2. Accept quote: Locks price, creates booking awaiting payment.
3. Pay securely: Stripe intent (test card works).
4. Track: Real-time status updates, driver assigned, proof photos on delivery.
5. Complete: Rate & confirm handover code + photo.

Shop owner (seller) secure link: Simple /sell page generates unique token link. Share with buyer or use for collection requests. No complex login needed for basic use.

## Admin Pilot Control Room
Use /bookings for overview of all: payment status, current booking status, driver assignment button, proof status (photos/codes), payout-ready flag.
/dispatch and /operations for live assignment and monitoring.

## Updated Tunbridge Wells Launch Data
Seeded automatically via pnpm db:seed:
- Towns: Royal Tunbridge Wells, Southborough, Tonbridge, Paddock Wood, Crowborough, Sevenoaks, Maidstone fringe
- Service zone, pricing rules, sample users (admin, buyer, approved/pending drivers), vehicle, quotes, bookings in various states (paid_awaiting_dispatch, in progress, completed, disputed).

## Launch Checklist Command
Run: pnpm launch:checklist
(Prints full pre-flight steps including the above.)

## Supabase + Stripe + Limitations
See sections above. For production: set RLS policies, real Stripe Connect accounts for drivers, monitoring.

All checks (typecheck/test/build) now pass with the added workflow tests covering quote acceptance, payment/webhook transitions, dispatch, and driver proof completion.
