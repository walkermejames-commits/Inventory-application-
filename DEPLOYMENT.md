If seller create-link fails with missing email/address_line columns in pickup_contacts, run the latest Supabase migration (004_add_pickup_contact_email_address.sql) or manually add the columns via Supabase SQL Editor:

```sql
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE pickup_contacts ADD COLUMN IF NOT EXISTS address_line text;
```