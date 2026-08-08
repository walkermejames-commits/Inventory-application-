# Four blockers fix (review branch)

Branch: `fix/four-blockers-schema-auth-booking-tests`

This change set addresses the four production blockers identified in the Door in Four review.

## 1. Schema / code drift

- Added `packages/db/migrations/005_buyer_led_schema_alignment.sql`
  - `seller_quote_pending` on `booking_status`
  - buyer-led booking columns (`item_title`, route fields, `seller_flow_type`, token hash, etc.)
  - payment uniqueness for checkout upserts
  - pickup/delivery column aliases used by seller routes
- Apply on Supabase after pull: run migration 005 (SQL editor or `pnpm db:migrate` if wired).

## 2. API authentication

- Shared helpers: `requireAdminApiAuth` / `requireMobileApiAuth` in `@door-in-four/shared`
- Admin middleware (`apps/admin/src/middleware.ts`) gates all `/api/*` except:
  - `/api/health`
  - `/api/webhooks/*`
  - `/api/auth/session`
- Auth modes:
  - `x-api-key` / `Authorization: Bearer` matching `ADMIN_API_SECRET`
  - mobile: `MOBILE_API_SECRET` or admin secret + optional `x-driver-id` match
  - browser UI: login at `/login` with `ADMIN_DASHBOARD_PASSWORD` → httpOnly `dif_admin_session`
  - non-production: open if secrets unset (logged warning); production fails closed
- Mutating admin routes also call `gateAdminApi` and prefer `x-actor-user-id` over untrusted body-only actors.

## 3. Dual booking model + payout consistency

- Single money constant: `DRIVER_PAYOUT_RATIO = 0.75` in `@door-in-four/types`
- Pricing engine uses the same ratio (was 0.78)
- DB trigger already 0.75; price-override / accept quote use `calculateDriverPayoutAmount`
- Buyer-led `POST /api/buy/create-quote` now creates:
  1. pickup + delivery rows
  2. **quotes** row
  3. **bookings** row with `quote_id` + denormalised fields + `seller_flow_type: buyer_led`
- Shared lifecycle helpers: `buildHappyPathSteps`, `isStatusTransitionAllowed` (includes `seller_quote_pending`)

## 4. Automated proof of the path

New / expanded tests:

- `packages/shared/tests.auth.test.ts` — API key / production fail-closed
- `packages/shared/tests.happy-path.test.ts` — full status path + money rules
- `packages/pricing/tests.pricing.test.ts` — 75% ratio alignment
- Existing workflow / e2e-rules tests still apply

Run:

```bash
pnpm test
pnpm typecheck
```

## Env vars to set for pilot / production

```bash
ADMIN_API_SECRET=...           # required in production
MOBILE_API_SECRET=...          # optional; falls back to admin secret
ADMIN_DASHBOARD_PASSWORD=...   # browser FC login
EXPO_PUBLIC_MOBILE_API_KEY=... # same value as mobile/admin secret for pilot app
```

## Reviewer checklist

- [ ] Migration 005 reviewed for production safety
- [ ] Confirm admin UI login + assign-driver still works with session cookie
- [ ] Confirm mobile jobs 401 without key when secrets set
- [ ] Confirm quote create inserts both `quotes` and `bookings`
- [ ] Confirm pricing driver payout is 75% of subtotal everywhere
