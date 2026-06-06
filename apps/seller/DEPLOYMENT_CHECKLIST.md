# Seller App Deployment Checklist

This checklist exists so the buyer quote flow can be verified without guessing.

## Current buyer quote flow

The new buyer-led quote flow lives at:

```text
/buy
```

The legacy quote path redirects here:

```text
/get-a-quote -> /buy
```

## Live URLs to check

Replace the domain if the Render service URL changes.

```text
https://door-in-four-seller.onrender.com/
https://door-in-four-seller.onrender.com/buy
https://door-in-four-seller.onrender.com/get-a-quote
```

## Expected live markers

Homepage should show:

```text
Buyer quote flow v2 is live at /buy
```

Buyer page should show:

```text
Buyer quote flow v2
```

If these markers do not appear, Render is not serving the latest seller build.

## Render settings

The seller service should deploy the seller app, not the admin app.

Recommended build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @door-in-four/seller build
```

Recommended start command:

```bash
pnpm --filter @door-in-four/seller start
```

Expected port:

```text
3002
```

## Required environment variables

Public/browser-safe:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SELLER_URL=https://door-in-four-seller.onrender.com
NEXT_PUBLIC_SITE_URL=https://door-in-four-seller.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Server-only:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SELLER_API_SECRET=
```

Do not expose server-only values as NEXT_PUBLIC values.

## Local validation commands

From repo root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @door-in-four/seller typecheck
pnpm --filter @door-in-four/seller lint
pnpm --filter @door-in-four/seller build
```

## If Render still shows the old form

Check these in order:

1. Confirm Render is deploying branch `main`.
2. Confirm the latest commit includes the seller homepage marker.
3. Confirm Render build did not fail and keep the previous successful deploy.
4. Open `/buy` directly instead of using old bookmarks.
5. Open `/get-a-quote` and confirm it redirects to `/buy`.
6. Confirm Render service build command targets `@door-in-four/seller`.
7. Confirm all required environment variables exist.

## Buyer quote flow files

```text
apps/seller/src/app/buy/page.tsx
apps/seller/src/app/get-a-quote/page.tsx
apps/seller/src/app/api/address/search/route.ts
apps/seller/src/app/api/postcodes/suggest/route.ts
apps/seller/src/app/api/buy/create-quote/route.ts
apps/seller/package.json
```

## Notes

Postcodes.io can suggest and validate postcodes, but it does not provide full UK house-level address lists. The UI should keep the exact address line editable.
