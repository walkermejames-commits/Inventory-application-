create extension if not exists "pgcrypto";

create type user_role as enum ('buyer','driver','admin');
create type driver_status as enum ('pending','approved','suspended','rejected');
create type vehicle_type as enum ('bicycle','motorcycle','car','estate','small_van','large_van','luton');
create type booking_status as enum (
  'draft','quote_requested','quote_created','quote_expired','awaiting_payment','payment_failed',
  'paid_awaiting_dispatch','driver_assigned','driver_en_route_to_pickup','driver_arrived_at_pickup',
  'pickup_verified','item_collected','driver_en_route_to_delivery','driver_arrived_at_delivery',
  'delivery_verified','delivered','completed','cancelled','disputed','refunded'
);
create type payment_status as enum (
  'quote_created','quote_expired','payment_pending','payment_authorised','payment_failed','paid','refunded',
  'partially_refunded','cancelled_with_fee','cancelled_full_refund','payout_pending','payout_ready','payout_sent','payout_failed'
);
create type photo_type as enum ('item','pickup_proof','delivery_proof','damage_report','document');

create table users (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  email text unique not null,
  phone text,
  full_name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table buyer_profiles (id uuid primary key default gen_random_uuid(), user_id uuid references users(id), default_phone text, default_address jsonb default '{}'::jsonb, rating_average numeric default 0, rating_count int default 0);
create table driver_profiles (id uuid primary key default gen_random_uuid(), user_id uuid references users(id), status driver_status default 'pending', stripe_connect_account_id text, service_radius_miles numeric default 20, current_availability boolean default false, rating_average numeric default 0, rating_count int default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create table driver_documents (id uuid primary key default gen_random_uuid(), driver_id uuid references driver_profiles(id), document_type text not null, file_url text not null, verification_status text default 'pending', uploaded_at timestamptz default now());
create table vehicles (id uuid primary key default gen_random_uuid(), driver_id uuid references driver_profiles(id), vehicle_type vehicle_type not null, registration text not null, make text, model text, colour text, capacity_notes text, active boolean default true);
create table service_zones (id uuid primary key default gen_random_uuid(), name text not null, centre_postcode text not null, centre_lat numeric not null, centre_lng numeric not null, radius_miles numeric not null, active boolean default true);
create table towns (id uuid primary key default gen_random_uuid(), name text not null unique, county text, postcode_prefixes text[] default '{}', lat numeric, lng numeric, active boolean default true);
create table zone_towns (id uuid primary key default gen_random_uuid(), zone_id uuid references service_zones(id), town_id uuid references towns(id));
create table pricing_rules (id uuid primary key default gen_random_uuid(), zone_id uuid references service_zones(id), rule_name text not null, rule_type text not null, value jsonb not null, active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now());
create table pickup_contacts (id uuid primary key default gen_random_uuid(), seller_name text not null, seller_phone text not null, seller_email text, address_line_1 text not null, address_line_2 text, town text not null, postcode text not null, notes text, secure_token_hash text not null, collection_confirmed boolean default false);
create table delivery_addresses (id uuid primary key default gen_random_uuid(), recipient_name text not null, recipient_phone text not null, address_line_1 text not null, address_line_2 text, town text not null, postcode text not null, notes text);
create table quotes (id uuid primary key default gen_random_uuid(), buyer_id uuid references users(id), pickup_postcode text not null, delivery_postcode text not null, route_distance_miles numeric not null, route_duration_minutes numeric not null, item_summary text not null, quote_breakdown jsonb not null, subtotal numeric not null, platform_fee numeric not null, total_price numeric not null, driver_payout_estimate numeric not null, currency text default 'gbp', expires_at timestamptz not null, accepted_at timestamptz, status text not null, created_at timestamptz default now());
create table bookings (id uuid primary key default gen_random_uuid(), quote_id uuid references quotes(id), buyer_id uuid references users(id), driver_id uuid references users(id), status booking_status not null default 'draft', payment_status payment_status not null default 'quote_created', pickup_contact_id uuid references pickup_contacts(id), delivery_address_id uuid references delivery_addresses(id), seller_handover_code_hash text, buyer_delivery_code_hash text, accepted_price numeric, driver_payout_amount numeric, platform_fee_amount numeric, scheduled_collection_start timestamptz, scheduled_collection_end timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table booking_items (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), title text not null, description text, category text, size text not null, approximate_weight_kg numeric, quantity int not null default 1, fragile boolean default false, requires_van boolean default false, requires_two_people boolean default false, disassembly_required boolean default false, pickup_stairs_floors int default 0, delivery_stairs_floors int default 0);
create table photos (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), uploaded_by_user_id uuid references users(id), photo_type photo_type not null, storage_path text not null, created_at timestamptz default now());
create table status_events (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), previous_status booking_status, new_status booking_status not null, actor_user_id uuid references users(id), actor_role text not null, note text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table payments (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), stripe_customer_id text, stripe_payment_intent_id text, stripe_charge_id text, amount numeric not null, currency text default 'gbp', status payment_status not null, created_at timestamptz default now(), updated_at timestamptz default now());
create table refunds (id uuid primary key default gen_random_uuid(), payment_id uuid references payments(id), stripe_refund_id text, amount numeric not null, reason text, status text, created_at timestamptz default now());
create table payouts (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), driver_id uuid references users(id), stripe_connect_account_id text, stripe_transfer_id text, amount numeric not null, currency text default 'gbp', status payment_status default 'payout_pending', created_at timestamptz default now(), updated_at timestamptz default now());
create table disputes (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), opened_by_user_id uuid references users(id), dispute_type text not null, description text not null, status text default 'open', resolution text, created_at timestamptz default now(), updated_at timestamptz default now());
create table ratings (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), rated_by_user_id uuid references users(id), rated_user_id uuid references users(id), score int check (score between 1 and 5), comment text, created_at timestamptz default now());
create table messages (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), sender_user_id uuid references users(id), message_body text not null, created_at timestamptz default now());
create table admin_notes (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), admin_user_id uuid references users(id), note text not null, created_at timestamptz default now());
create table audit_events (id uuid primary key default gen_random_uuid(), actor_user_id uuid references users(id), actor_role text not null, action text not null, entity_type text not null, entity_id uuid not null, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table prohibited_item_reports (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings(id), reported_by_user_id uuid references users(id), description text not null, status text default 'open', created_at timestamptz default now());

alter table users enable row level security;
alter table quotes enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;

create policy "buyers view own quotes" on quotes for select using (buyer_id = auth.uid());
create policy "buyers view own bookings" on bookings for select using (buyer_id = auth.uid());
create policy "drivers view assigned bookings" on bookings for select using (driver_id = auth.uid());
create policy "admins full users" on users using (exists (select 1 from users u where u.id = auth.uid() and u.role='admin'));
create policy "admins full quotes" on quotes using (exists (select 1 from users u where u.id = auth.uid() and u.role='admin'));
create policy "admins full bookings" on bookings using (exists (select 1 from users u where u.id = auth.uid() and u.role='admin'));
create policy "admins full payments" on payments using (exists (select 1 from users u where u.id = auth.uid() and u.role='admin'));
