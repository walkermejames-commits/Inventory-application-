# Door in Four — Deployment (Render)

> Work from branch `fix/four-blockers-schema-auth-booking-tests` until release is approved.  
> **Do not merge to `main` or promote production until the release candidate audit is signed off.**

## Services

| Service | Workspace | Suggested Render name | Port |
|---------|-----------|----------------------|------|
| Admin + driver API | `@door-in-four/admin` | `door-in-four-admin` | 3001 |
| Seller / buyer portal | `@door-in-four/seller` | `door-in-four-seller` | 3002 |
| Mobile (Expo) | `@door-in-four/mobile` | **not on Render** — Expo Go / EAS | n/a |

### Admin (API + FC board)

```sh
# Build
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
pnpm --filter @door-in-four/admin build

# Start
pnpm --filter @door-in-four/admin start
```

Health check: `GET /api/health`

### Seller

```sh
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
pnpm --filter @door-in-four/seller build
pnpm --filter @door-in-four/seller start
```

Health check: `GET /api/health`

## Branch to deploy

Deploy **`fix/four-blockers-schema-auth-booking-tests`** for pilot RC testing.  
After approval, merge to `main` (manual) and redeploy `main`.

## Required environment variables

### Admin service

```txt
NODE_ENV=production
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=
MAPS_API_KEY=
APP_URL=
ADMIN_APP_URL=https://<admin-host>
SELLER_APP_URL=https://<seller-host>
MOBILE_DEEP_LINK_URL=doorinfour://
ADMIN_API_SECRET=          # required in production
ADMIN_DASHBOARD_PASSWORD=  # FC browser login
MOBILE_API_SECRET=         # driver app shared pilot secret
DISPATCH_REFLEX_SECRET=    # optional; required if using dispatch-reflex in prod
SUPABASE_PROOF_BUCKET=booking-proofs
DEFAULT_CURRENCY=gbp
```

### Seller service

```txt
NODE_ENV=production
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SELLER_URL=https://<seller-host>
STRIPE_SECRET_KEY=
APP_URL=
SELLER_APP_URL=https://<seller-host>
ADMIN_APP_URL=https://<admin-host>
MOBILE_DEEP_LINK_URL=doorinfour://
DEFAULT_CURRENCY=gbp
```

### Mobile (Expo — local / EAS, not Render)

```txt
EXPO_PUBLIC_ADMIN_API_URL=https://<admin-host>
EXPO_PUBLIC_DEMO_DRIVER_ID=<users.id of pilot driver>
EXPO_PUBLIC_MOBILE_API_KEY=<same as MOBILE_API_SECRET>
```

Label: **private pilot mode only** — not production driver auth.

## Supabase migrations (apply in order)

1. `001_init.sql`
2. `002_hardening.sql`
3. `003_constraints.sql`
4. `004_add_pickup_contact_email_address.sql`
5. `005_buyer_led_schema_alignment.sql`
6. `006_release_candidate_ops_and_storage.sql`

### Storage bucket (manual)

Create private bucket **`booking-proofs`** in Supabase Storage.  
Admin API uploads with service role. Paths: `proofs/{bookingId}/{photoType}-{ts}.ext`.

### Stripe webhook

Forward `payment_intent.succeeded` / `checkout.session.completed` to:

`https://<admin-host>/api/webhooks/stripe`

## Seller create-link note

If create-link fails on missing columns, ensure migrations 004+005 are applied:

```sql
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS address_line text;
```

## Full audit

See `RELEASE_CANDIDATE_AUDIT.md` on this branch.
