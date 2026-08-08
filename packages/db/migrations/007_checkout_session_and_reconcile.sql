-- Migration 007: Stripe checkout session persistence + payout reconcile safety
-- Additive only.

-- ---------------------------------------------------------------------------
-- Payments: store Checkout Session id for reuse / recovery
-- ---------------------------------------------------------------------------
alter table payments add column if not exists stripe_checkout_session_id text;
alter table payments add column if not exists checkout_attempt int default 0;

create unique index if not exists payments_stripe_checkout_session_unique_idx
  on payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- ---------------------------------------------------------------------------
-- Ensure one payout row per booking (idempotent reconcile / upsert)
-- ---------------------------------------------------------------------------
create unique index if not exists payouts_booking_id_unique_idx
  on payouts (booking_id);

comment on column payments.stripe_checkout_session_id is
  'Stripe Checkout Session id for unpaid booking retries; reuse while session.status=open';
