If seller create-link fails with missing email/address_line columns in pickup_contacts, run the latest Supabase migration (004_add_pickup_contact_email_address.sql) or manually add the columns via Supabase SQL Editor:

```sql
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS address_line text;
```

## Security hardening env vars

Set these secrets before deploying the admin app:

- `ADMIN_API_SECRET`: server-only secret for protected admin API routes. Do not prefix it with `NEXT_PUBLIC_` or expose it in browser code.
- `DISPATCH_REFLEX_SECRET`: server-only secret for dispatch-reflex cron runs. The `/api/organism/dispatch-reflex` route fails closed with `503` when this is missing.
- `DEMO_DRIVER_ID`: temporary pilot/demo driver profile ID allowed to use the mobile jobs API without Supabase mobile login.
- `DEMO_DRIVER_API_SECRET`: server-side copy of the temporary pilot/demo mobile secret.

For the temporary mobile pilot path, set these in the Expo environment:

- `EXPO_PUBLIC_ADMIN_API_URL`
- `EXPO_PUBLIC_DEMO_DRIVER_ID`
- `EXPO_PUBLIC_DEMO_DRIVER_API_SECRET`

`EXPO_PUBLIC_DEMO_DRIVER_API_SECRET` is intentionally a temporary pilot credential. Replace it with Supabase mobile login and a bearer access token before broad driver rollout.

The FC admin UI uses server actions for driver assignment, so browser code does not need `ADMIN_API_SECRET`. Direct admin API calls in production still require `ADMIN_API_SECRET` or a valid Supabase admin bearer token.

## Render Cron dispatch reflex

Configure Render Cron to call the admin app:

```text
POST https://<admin-app-host>/api/organism/dispatch-reflex
Header: x-dispatch-reflex-secret: <DISPATCH_REFLEX_SECRET>
```

Bearer auth is also accepted, but `x-dispatch-reflex-secret` is the preferred Render Cron header.
