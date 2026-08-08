# Door in Four — Release Candidate Audit

**Branch:** `fix/four-blockers-schema-auth-booking-tests`  
**Date:** 2026-08-08  
**Status:** Pilot release candidate — **DO NOT merge to main until sign-off**

---

## 1. Architecture map

```text
┌─────────────────┐     quotes/checkout      ┌──────────────────┐
│  apps/seller    │ ───────────────────────► │   Supabase DB    │
│  buyer/seller   │                          │   + Storage      │
│  public portal  │                          └────────▲─────────┘
└────────┬────────┘                                   │
         │ Stripe Checkout / payment intents          │ service role
         ▼                                            │
┌─────────────────┐   webhooks / admin APIs   ┌───────┴──────────┐
│     Stripe      │ ◄───────────────────────► │  apps/admin      │
└─────────────────┘                           │  FC + driver API │
                                              └────────▲─────────┘
                                                       │
                         x-api-key + x-driver-id       │
                                              ┌────────┴─────────┐
                                              │  apps/mobile     │
                                              │  Expo driver app │
                                              └──────────────────┘

packages: types | pricing | shared | config | db | ui
```

**Canonical lifecycle (driver segment is strict, no skips):**

```text
seller_quote_pending / quote_created
  → awaiting_payment
  → paid_awaiting_dispatch   (Stripe webhook)
  → driver_assigned          (admin dispatch)
  → driver_en_route_to_pickup
  → driver_arrived_at_pickup
  → pickup_verified          (code + storage proof)
  → item_collected
  → driver_en_route_to_delivery
  → driver_arrived_at_delivery
  → delivery_verified        (code + storage proof)
  → delivered
  → completed                (payout_ready)
```

**Money model (single source):**

| Field | Rule |
|-------|------|
| Subtotal | `packages/pricing` engine |
| Platform fee | `max(1.5, subtotal * 0.10)` |
| Buyer total | subtotal + platform fee |
| Driver payout | **75% of subtotal** (`DRIVER_PAYOUT_RATIO`) |
| Payout ready | only when `booking.status === completed` |

---

## 2. Route / auth matrix

### Admin app (`apps/admin`)

| Route | Class | Auth |
|-------|-------|------|
| `GET /api/health` | PUBLIC | none |
| `POST/DELETE /api/auth/session` | PUBLIC (login) | dashboard password → cookie |
| `POST /api/webhooks/stripe` | WEBHOOK | Stripe signature |
| `GET /api/bookings/list` | ADMIN | `gateAdminApi` + middleware |
| `POST /api/bookings/[id]` | ADMIN | `gateAdminApi` |
| `POST /api/bookings/[id]/status` | ADMIN | `gateAdminApi` |
| `POST /api/bookings/[id]/notes` | ADMIN | `gateAdminApi` (fixed) |
| `POST /api/bookings/[id]/disputes` | ADMIN | `gateAdminApi` (fixed) |
| `GET /api/bookings/[id]/audit` | ADMIN | `gateAdminApi` (fixed) |
| `POST /api/bookings/[id]/price-override` | ADMIN | `gateAdminApi` |
| `POST /api/dispatch/*` | ADMIN | `gateAdminApi` |
| `POST /api/operations/assign-driver` | ADMIN | `gateAdminApi` |
| `POST /api/quotes` | ADMIN | `gateAdminApi` |
| `POST /api/quotes/[id]/accept` | ADMIN | `gateAdminApi` |
| `POST /api/payments/*` | ADMIN | `gateAdminApi` |
| `POST /api/payouts/[id]/trigger` | ADMIN | `gateAdminApi` |
| `GET /api/mobile/jobs` | DRIVER | mobile/admin key + `x-driver-id` |
| `POST /api/mobile/jobs/respond` | DRIVER | mobile key + driver id |
| `POST /api/mobile/onboarding` | DRIVER | mobile key |
| `POST /api/mobile/proof-upload` | DRIVER | mobile key + driver id |
| `POST /api/drivers/jobs/[id]/progress` | DRIVER | mobile key + driver id |
| `GET /api/drivers/jobs` | DRIVER | mobile key + driver id (fixed) |
| `POST /api/drivers/signup` | DRIVER | mobile key (fixed) |
| `POST/GET /api/organism/dispatch-reflex` | ADMIN/INTERNAL | reflex secret or admin key; fail-closed in prod if unset |

**Page protection:** middleware redirects unauthenticated users to `/login` in **production** when `ADMIN_DASHBOARD_PASSWORD` + `ADMIN_API_SECRET` are set.

### Seller app (`apps/seller`)

| Route | Class | Auth |
|-------|-------|------|
| `GET /api/health` | PUBLIC | none |
| `GET /api/postcodes/suggest` | PUBLIC | rate-limit recommended |
| `GET /api/address/search` | PUBLIC | rate-limit recommended |
| `POST /api/buy/create-quote` | PUBLIC buyer | sanitised inputs |
| `POST /api/sell/create-link` | PUBLIC seller | token hash stored |
| `POST /api/buyer/submit-details` | BUYER TOKEN | private token hash |
| `GET/PATCH /api/bookings/[id]` | BUYER/SELLER TOKEN | **Requires access token** (buyer `private_buyer_token_hash` or seller `secure_token_hash`). Booking UUID alone rejected. |
| `POST /api/checkout` | BUYER TOKEN | **Requires buyer access token**; persists payment row first; reuses open Stripe sessions; Idempotency-Key on create |
| `POST /api/payouts/[id]/reconcile` | ADMIN | Idempotent repair for completed bookings with incomplete payout_ready |
| `POST /api/seller/*` | SELLER TOKEN | token/hash where implemented |

---

## 3. Data lifecycle & migrations

Apply **in order**:

1. `001_init.sql`
2. `002_hardening.sql`
3. `003_constraints.sql`
4. `004_add_pickup_contact_email_address.sql`
5. `005_buyer_led_schema_alignment.sql` — buyer-led columns + `seller_quote_pending`
6. `006_release_candidate_ops_and_storage.sql` — `dispatch_timers`, `operational_events`, indexes
7. `007_checkout_session_and_reconcile.sql` — `payments.stripe_checkout_session_id`, `checkout_attempt`

**Manual:** create Supabase Storage bucket `booking-proofs` (private).

**Atomicity risk (documented):** buyer create-quote inserts pickup → delivery → quote → booking as separate statements. Failure mid-way can leave orphan contact rows. Acceptable for pilot; prefer RPC transaction post-pilot.

---

## 4. Deployment map

| Hosting | Service | Notes |
|---------|---------|-------|
| Render | Admin | Next start port 3001; webhook target |
| Render | Seller | Next start port 3002 |
| Expo | Mobile | Expo Go on iPad; EAS project ID **not configured** |
| Supabase | DB + Storage | migrations + bucket |
| Stripe | Payments | test mode for pilot |

See `DEPLOYMENT.md`.

---

## 5. Environment variables by service

See `DEPLOYMENT.md` and `.env.example`.

Critical production:

- `ADMIN_API_SECRET` (required)
- `MOBILE_API_SECRET` (driver pilot)
- `ADMIN_DASHBOARD_PASSWORD` (FC UI)
- Stripe + Supabase service role

---

## 6. Tests performed

| Command | Result |
|---------|--------|
| `pnpm test` | unit/boundary suites |
| `pnpm typecheck` | all workspaces |
| `pnpm build` / per-app Next build | with env placeholders |

Coverage includes: admin auth required, driver identity, lifecycle skips, proof path rejection, payout rules, pricing 75%, mobile progress helpers.

---

## 7. Known pilot limitations

1. **Mobile auth is private-pilot** (`EXPO_PUBLIC_DEMO_DRIVER_ID` + shared mobile secret) — not real driver login.
2. **EAS projectId not set** — no cloud build until you create a real EAS project.
3. **Quote/booking multi-insert** not fully transactional (orphan contact risk mid-create).
4. **Admin pages** in development can load without cookie if secrets unset (dev open).
5. **Dependabot** reports many dependency vulns on default branch (pre-existing).
6. **Proof upload** requires Storage bucket + service role; without bucket, verification cannot complete.
7. **Seller booking IDOR** on GET/PATCH/checkout: **fixed** — access token required (buyer or seller hash).
8. **Payout after completed**: dedicated `POST /api/payouts/:id/reconcile` (admin) — idempotent recovery without weakening driver lifecycle.
9. **Checkout sessions**: payment row pre-persist + session id storage + reuse of `open` sessions (migration **007**).
10. **Access tokens in query strings** (quote/checkout/track URLs): residual risk if URLs are logged or shared; avoid logging full URLs server-side; prefer short-lived tokens post-pilot.

---

## 8. Remaining blockers before production

| # | Blocker | Severity |
|---|---------|----------|
| 1 | Apply migrations 005–006 + create `booking-proofs` bucket | Hard |
| 2 | Configure production secrets on Render | Hard |
| 3 | Stripe webhook URL + Connect for real payouts | Hard |
| 4 | Replace pilot mobile auth with real driver accounts | Medium |
| 5 | End-to-end manual pilot on device | Medium |
| 6 | Dependency vulnerability remediation | Medium |

---

## 9. Manual pilot script (happy path)

1. Apply migrations + storage bucket.  
2. Deploy admin + seller from this branch.  
3. Seed: `pnpm db:seed` (or create pilot users).  
4. Seller: create quote → accept → Stripe test pay.  
5. Confirm webhook → `paid_awaiting_dispatch`.  
6. Admin `/login` → assign driver.  
7. iPad Expo Go → jobs → detail → walk lifecycle with codes + camera proofs.  
8. Confirm `completed` + `payout_ready` + audit/status_events rows.
