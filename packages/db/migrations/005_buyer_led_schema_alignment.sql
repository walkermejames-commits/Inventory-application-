-- Migration 005: align DB with seller/admin/mobile buyer-led booking fields.
-- Fixes schema drift between 001_init and runtime application code.

-- ---------------------------------------------------------------------------
-- Enum extensions (safe if already applied on drifted prod DBs)
-- ---------------------------------------------------------------------------
do $$ begin
  alter type booking_status add value 'seller_quote_pending';
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Bookings: denormalised item / route / seller-flow columns used by apps
-- ---------------------------------------------------------------------------
alter table bookings add column if not exists item_title text;
alter table bookings add column if not exists item_size text;
alter table bookings add column if not exists approximate_weight_kg numeric;
alter table bookings add column if not exists fragile boolean default false;
alter table bookings add column if not exists requires_two_people boolean default false;
alter table bookings add column if not exists requires_van boolean default false;
alter table bookings add column if not exists preferred_pickup_window text;
alter table bookings add column if not exists delivery_quote_amount numeric;
alter table bookings add column if not exists seller_flow_type text;
alter table bookings add column if not exists private_buyer_token_hash text;
alter table bookings add column if not exists seller_confirmed_item_payment boolean default false;
alter table bookings add column if not exists seller_paid_delivery boolean default false;
alter table bookings add column if not exists pickup_latitude numeric;
alter table bookings add column if not exists pickup_longitude numeric;
alter table bookings add column if not exists delivery_latitude numeric;
alter table bookings add column if not exists delivery_longitude numeric;
alter table bookings add column if not exists route_distance_miles numeric;
alter table bookings add column if not exists route_duration_minutes numeric;
alter table bookings add column if not exists route_estimated boolean default false;

create index if not exists bookings_private_buyer_token_idx
  on bookings (private_buyer_token_hash)
  where private_buyer_token_hash is not null;

create index if not exists bookings_seller_flow_status_idx
  on bookings (seller_flow_type, status);

-- ---------------------------------------------------------------------------
-- pickup_contacts: keep seller_email / address_line_1 as canonical;
-- 004 already added email / address_line aliases used by seller create-link.
-- ---------------------------------------------------------------------------
alter table pickup_contacts add column if not exists phone text;
alter table pickup_contacts alter column secure_token_hash drop not null;
alter table pickup_contacts alter column address_line_1 drop not null;

-- ---------------------------------------------------------------------------
-- delivery_addresses: optional address_line alias used by some seller routes
-- ---------------------------------------------------------------------------
alter table delivery_addresses add column if not exists address_line text;

-- ---------------------------------------------------------------------------
-- payments: support upsert by booking_id (checkout session path)
-- ---------------------------------------------------------------------------
create unique index if not exists payments_booking_id_unique_idx on payments (booking_id);
create unique index if not exists payments_stripe_payment_intent_unique_idx
  on payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- Keep driver payout ratio consistent with app (75% of accepted_price / subtotal)
-- ---------------------------------------------------------------------------
create or replace function set_driver_payout_estimate()
returns trigger language plpgsql as $$
begin
  if new.driver_payout_amount is null and new.accepted_price is not null then
    new.driver_payout_amount := round((new.accepted_price * 0.75)::numeric, 2);
  end if;
  return new;
end;
$$;
