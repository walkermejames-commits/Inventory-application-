-- Migration 007: Stripe checkout session persistence + payout reconcile safety
-- Additive only.

-- ---------------------------------------------------------------------------
-- PREFLIGHT: duplicate payouts.booking_id rows
-- Run this SELECT before applying the unique index (or rely on the DO block below).
-- If any rows are returned, resolve duplicates manually first, e.g. keep the newest:
--
--   SELECT booking_id, count(*) AS n, array_agg(id ORDER BY created_at DESC) AS ids
--   FROM payouts
--   GROUP BY booking_id
--   HAVING count(*) > 1;
--
-- The DO block aborts the migration if duplicates still exist so the unique index
-- cannot fail opaquely mid-apply.
-- ---------------------------------------------------------------------------
do $$
declare
  dup_count int;
begin
  select count(*) into dup_count
  from (
    select booking_id
    from payouts
    group by booking_id
    having count(*) > 1
  ) d;

  if dup_count > 0 then
    raise exception
      'PREFLIGHT FAILED: % booking_id value(s) have duplicate payouts rows. Resolve with: SELECT booking_id, count(*) FROM payouts GROUP BY booking_id HAVING count(*) > 1; then re-run migration 007.',
      dup_count;
  end if;
end $$;

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
-- Safe only after the preflight above succeeds.
-- ---------------------------------------------------------------------------
create unique index if not exists payouts_booking_id_unique_idx
  on payouts (booking_id);

comment on column payments.stripe_checkout_session_id is
  'Stripe Checkout Session id for unpaid booking retries; reuse while session.status=open';

comment on column payments.checkout_attempt is
  'Logical checkout attempt for Stripe Idempotency-Key. Do not increment solely because session id is missing after partial Stripe create; advance only when prior session is terminal or amount changes.';
