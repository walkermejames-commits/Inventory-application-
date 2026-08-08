-- Migration 006: release-candidate ops tables + proof storage support
-- Additive only — does not rewrite prior migrations.

-- ---------------------------------------------------------------------------
-- Ops tables used by dispatch-reflex organism (were referenced but missing)
-- ---------------------------------------------------------------------------
create table if not exists dispatch_timers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  driver_id uuid references users(id),
  timer_type text not null,
  status text not null default 'active',
  due_at timestamptz not null,
  escalation_level int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists dispatch_timers_active_due_idx
  on dispatch_timers (status, due_at)
  where status = 'active';

create table if not exists operational_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  driver_id uuid references users(id),
  event_type text not null,
  priority text default 'normal',
  title text,
  detail text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists operational_events_booking_created_idx
  on operational_events (booking_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Payouts: unique booking_id for upsert onConflict used by payout trigger
-- ---------------------------------------------------------------------------
create unique index if not exists payouts_booking_id_unique_idx
  on payouts (booking_id);

-- ---------------------------------------------------------------------------
-- Photos audit helpers
-- ---------------------------------------------------------------------------
create index if not exists photos_booking_type_idx
  on photos (booking_id, photo_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Notes on Supabase Storage (manual / dashboard step — SQL cannot always create buckets)
-- Create a private bucket named: booking-proofs
-- Recommended path layout: proofs/{bookingId}/{photoType}-{timestamp}.ext
-- Service role (admin API) uploads; do not expose bucket as public.
-- ---------------------------------------------------------------------------
comment on table photos is 'Proof and item photos. storage_path is relative path inside SUPABASE_PROOF_BUCKET (default booking-proofs).';
