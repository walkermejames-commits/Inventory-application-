create unique index if not exists users_email_unique_idx on users(email);
create index if not exists quotes_buyer_created_idx on quotes(buyer_id, created_at desc);
create index if not exists quotes_status_expires_idx on quotes(status, expires_at);
create index if not exists bookings_buyer_status_idx on bookings(buyer_id, status);
create index if not exists bookings_driver_status_idx on bookings(driver_id, status);
create index if not exists bookings_payment_status_idx on bookings(payment_status);
create index if not exists status_events_booking_created_idx on status_events(booking_id, created_at desc);
create index if not exists payments_intent_idx on payments(stripe_payment_intent_id);
create index if not exists pickup_contacts_secure_token_idx on pickup_contacts(secure_token_hash);
create index if not exists audit_events_entity_created_idx on audit_events(entity_type, entity_id, created_at desc);

create unique index if not exists towns_name_unique_idx on towns(name);
create unique index if not exists pricing_rules_unique_name_per_zone_idx on pricing_rules(zone_id, rule_name);

-- helper function for immutable payout estimate capture
create or replace function set_driver_payout_estimate()
returns trigger language plpgsql as $$
begin
  if new.driver_payout_amount is null and new.accepted_price is not null then
    new.driver_payout_amount := round((new.accepted_price * 0.75)::numeric, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists booking_set_payout_estimate_trg on bookings;
create trigger booking_set_payout_estimate_trg
before insert on bookings
for each row execute procedure set_driver_payout_estimate();
