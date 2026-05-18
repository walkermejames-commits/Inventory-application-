-- Migration: 004_add_pickup_contact_email_address
-- Adds email and address_line columns to pickup_contacts table
-- so the seller create-link flow can save seller email and pickup address.

ALTER TABLE pickup_contacts
ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE pickup_contacts
ADD COLUMN IF NOT EXISTS address_line text;

-- Optional: backfill from existing columns if they exist
-- UPDATE pickup_contacts SET email = seller_email WHERE email IS NULL AND seller_email IS NOT NULL;
-- UPDATE pickup_contacts SET address_line = address_line_1 WHERE address_line IS NULL AND address_line_1 IS NOT NULL;
