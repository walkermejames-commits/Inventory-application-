# Door in Four — Deployment & Testing Guide

## Overview
- **Admin + Backend APIs**: Deployed on Render at https://inventory-application-was4.onrender.com
- **Seller/Customer Web App**: Separate Render Web Service (to be deployed)
- **Driver Mobile App**: Expo Go (local testing only)

All apps are kept separate but connected via environment variables.

---

## 1. Admin App (Already Deployed)

**Current URL**: https://inventory-application-was4.onrender.com

**Render Settings** (for reference):
- Root Directory: `apps/admin`
- Build Command: `cd ../.. && pnpm install && pnpm --filter @door-in-four/admin build`
- Start Command: `cd ../.. && pnpm --filter @door-in-four/admin start`

**Environment Variables** (set in Render):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_SELLER_APP_URL` (add after seller is deployed)

---

## 2. Seller/Customer Web App Deployment (New)

**Render Web Service Settings**:

- **Name**: door-in-four-seller (or similar)
- **Environment**: Node
- **Region**: Oregon (US West)
- **Root Directory**: `apps/seller`
- **Build Command**: `cd ../.. && pnpm install && pnpm --filter @door-in-four/seller build`
- **Start Command**: `cd ../.. && pnpm --filter @door-in-four/seller start`
- **Auto Deploy**: Yes (on push to main)

**Environment Variables** (set in Render Dashboard):
```
NEXT_PUBLIC_ADMIN_API_URL=https://inventory-application-was4.onrender.com
NEXT_PUBLIC_SELLER_APP_URL=https://your-seller-app.onrender.com
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

After deployment, update `NEXT_PUBLIC_SELLER_APP_URL` in the admin app's environment variables.

---

## 3. Mobile Driver App (Expo Go Testing)

**No App Store deployment yet** — use Expo Go only.

### Local Development
```bash
pnpm dev:mobile
```

### Expo Go Testing Steps
1. Install **Expo Go** app on your phone
2. Run `pnpm dev:mobile` (or `expo start` in apps/mobile)
3. Scan the QR code with Expo Go
4. In the app:
   - Sign up as a driver (creates profile in Supabase)
   - Paste your Driver ID or use saved ID
   - Load jobs (calls admin API)
   - Progress through statuses (en route → arrived → verify → collected → etc.)

**Required env in apps/mobile/.env** (or set in Expo):
```
EXPO_PUBLIC_ADMIN_API_URL=https://inventory-application-was4.onrender.com
```

---

## 4. Environment Variables Summary

### Admin App (Render)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_SELLER_APP_URL` (add after seller deploy)

### Seller App (Render)
- `NEXT_PUBLIC_ADMIN_API_URL=https://inventory-application-was4.onrender.com`
- `NEXT_PUBLIC_SELLER_APP_URL=https://your-seller-app.onrender.com`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Mobile App (Expo)
- `EXPO_PUBLIC_ADMIN_API_URL=https://inventory-application-was4.onrender.com`

---

## 5. Local Development Commands

```bash
# All apps
pnpm dev

# Individual
pnpm dev:admin      # http://localhost:3001
pnpm dev:seller     # http://localhost:3002
pnpm dev:mobile     # Expo

# Build
pnpm build:admin
pnpm build:seller
pnpm build:mobile
```

---

## 6. Test Checklist

### Admin Dashboard
- [ ] Open https://inventory-application-was4.onrender.com
- [ ] View bookings list
- [ ] View driver assignments
- [ ] Check driver progress updates

### Seller/Customer Flow
- [ ] Open seller URL
- [ ] Create a new delivery link (fill form + confirm checkbox)
- [ ] Copy buyer message and private link
- [ ] Open buyer link in new tab
- [ ] Submit delivery details as buyer
- [ ] Verify booking status updates in admin

### Driver Mobile (Expo Go)
- [ ] Run `pnpm dev:mobile`
- [ ] Sign up as new driver
- [ ] Load assigned jobs
- [ ] Progress a job through all valid statuses:
  - En route to pickup
  - Arrived at pickup
  - Verify pickup & collect (enter code + photo)
  - En route to delivery
  - Verify delivery
  - Mark delivered
  - Complete job

---

## 7. Important Notes

- **Do not merge apps**: Admin and Seller remain separate Next.js apps.
- **Backend**: All APIs live in the admin app (Supabase + Stripe).
- **Seller** calls admin APIs via `NEXT_PUBLIC_ADMIN_API_URL`.
- **Mobile** calls the same admin API.
- After deploying seller, update `NEXT_PUBLIC_SELLER_APP_URL` in admin env vars.

---

## 8. What Still Needs Manual Deployment

- Deploy the seller app as a new Render Web Service using the settings above.
- After seller deployment, update admin's `NEXT_PUBLIC_SELLER_APP_URL`.
- (Optional) Add custom domain for seller app later.

---

**Last Updated**: May 2026
