# Door in Four (Monorepo)

Production-focused MVP for a buyer-led local collection and delivery service.

## 1) Monorepo layout

- `apps/mobile` — Expo React Native app for buyer + driver workflow.
- `apps/admin` — Next.js admin/dispatch dashboard + operational APIs.
- `apps/seller` — Next.js secure seller collection link flow.
- `packages/config` — Zod environment loaders (`loadAdminEnv`, `loadSellerEnv`, `loadMobileEnv`, `loadDbEnv`).
- `packages/types` — shared domain types/status enums.
- `packages/shared` — workflow guards and platform helpers.
- `packages/pricing` — quote/pricing engine.
- `packages/db` — SQL migrations and idempotent seed.
- `packages/ui` — shared UI/brand primitives.

## 2) Package manager reliability (pnpm + fallback)

### Preferred (Corepack + pinned pnpm)

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
```

If Corepack cannot fetch due network/proxy restrictions, configure an npm proxy mirror first or pre-install pnpm in your CI image.

### npm fallback (best-effort)

```bash
npm run install:npm-fallback
```

> Notes:
> - Workspaces are pnpm-first; npm fallback helps in constrained environments but pnpm is recommended for consistent lockfile behavior.

### CI recommendation

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile=false
pnpm typecheck
pnpm test
pnpm build
```

## 3) Environment setup

Copy env templates:

```bash
cp .env.example .env
cp apps/admin/.env.example apps/admin/.env.local
cp apps/seller/.env.example apps/seller/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Required env vars are validated at startup using Zod. Missing values throw descriptive errors.

## 4) Supabase setup

1. Create project.
2. Run migrations in order:
   - `packages/db/migrations/001_init.sql`
   - `packages/db/migrations/002_hardening.sql`
   - `packages/db/migrations/003_constraints.sql`
3. Seed launch data:

```bash
pnpm db:seed
```

## 5) Stripe setup

1. Add Stripe keys into `.env` / admin env.
2. Start webhook forwarder:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

3. Test card: `4242 4242 4242 4242`.

## 6) Running locally

```bash
pnpm dev:admin
pnpm dev:seller
pnpm dev:mobile
```

## 7) Build / checks

```bash
pnpm typecheck
pnpm test
pnpm build:admin
pnpm build:seller
```

## 8) End-to-end operational happy path (current implementation)

1. Buyer creates quote (`POST /api/quotes`).
2. Buyer accepts quote (`POST /api/quotes/:quoteId/accept`) -> booking locked in `awaiting_payment`.
3. Buyer starts payment intent (`POST /api/payments/create-intent`).
4. Stripe webhook marks payment `paid` and booking `paid_awaiting_dispatch`.
5. Admin assigns driver (`POST /api/dispatch/assign`).
6. Driver updates progression (`POST /api/drivers/jobs/:bookingId/progress`) with required pickup/delivery code + proof paths.
7. On completion, payout row marked `payout_ready`.
8. Admin triggers payout (`POST /api/payouts/:bookingId/trigger`) if Stripe Connect configured.

## 9) Tunbridge Wells launch checklist

- [ ] Tunbridge Wells launch zone exists and active.
- [ ] Launch towns seeded: Royal Tunbridge Wells, Southborough, Tonbridge, Paddock Wood, Crowborough, Sevenoaks, Maidstone fringe.
- [ ] One approved small van driver available.
- [ ] Stripe webhook configured and verified.
- [ ] Test paid booking visible in admin `/bookings`.
- [ ] Seller secure link validates token.
- [ ] Pickup + delivery proof photos create `photos` records.
- [ ] Booking completion creates payout-ready record.

## 10) Deployment notes

- Deploy `apps/admin` and `apps/seller` as separate Next.js services.
- Use EAS for `apps/mobile` builds.
- Configure Supabase Storage buckets and RLS policies per role.
- Set Sentry and email provider in production.
