If seller create-link fails with missing email/address_line columns in pickup_contacts, run the latest Supabase migration (004_add_pickup_contact_email_address.sql) or manually add the columns via Supabase SQL Editor:

```sql
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS address_line text;
```

## Render seller service

The seller portal should deploy the `@door-in-four/seller` workspace.

Build command:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @door-in-four/seller build
```

Start command:

```sh
pnpm --filter @door-in-four/seller start
```

Required environment variables:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SELLER_URL
```

`NEXT_PUBLIC_SITE_URL` is also supported as a fallback, but Render should prefer `NEXT_PUBLIC_SELLER_URL` for the seller service.
