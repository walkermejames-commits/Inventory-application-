#!/usr/bin/env node
console.log(`
============================================
Door in Four - Tunbridge Wells Launch Checklist
============================================

1. Pull latest main: git pull origin main
2. Enable pnpm: corepack enable && corepack prepare pnpm@9.15.4 --activate
3. Install: pnpm install
4. Verify: pnpm typecheck && pnpm test && pnpm build
   (now includes tests for pricing, quote accept, payment/webhook, dispatch, driver proof)
5. Supabase local/remote: pnpm db:seed  (seeds Tunbridge Wells launch towns + sample users/bookings)
6. Stripe: add keys to .env*, run 'stripe listen --forward-to localhost:3001/api/webhooks/stripe'
7. Pilot control room (admin): pnpm dev:admin
   - Visit http://localhost:3001/bookings  (payment status, proof)
   - /dispatch and /operations (driver assignment, payout-ready)
8. Seller secure link for shop owners: pnpm dev:seller -> /sell  (simple token link creation)
9. Buyer-facing: /buy or get-a-quote with plain language steps
10. Demo happy path: quote -> accept -> pay -> webhook paid -> assign driver -> proof complete -> payout ready

Seeded launch areas: Royal Tunbridge Wells, Southborough, Tonbridge, Paddock Wood, Crowborough, Sevenoaks, Maidstone fringe

Limitations: Pilot only (no live national scale), test Stripe keys, Supabase RLS must be set for production.
`);
