-- Keep all customer, driver, payment-adjacent, and operational records private by default.
-- Server-side code uses the Supabase service role key, which bypasses RLS for trusted workflows.
alter table buyer_profiles enable row level security;
alter table driver_profiles enable row level security;
alter table driver_documents enable row level security;
alter table vehicles enable row level security;
alter table service_zones enable row level security;
alter table towns enable row level security;
alter table zone_towns enable row level security;
alter table pricing_rules enable row level security;
alter table pickup_contacts enable row level security;
alter table delivery_addresses enable row level security;
alter table booking_items enable row level security;
alter table photos enable row level security;
alter table status_events enable row level security;
alter table refunds enable row level security;
alter table payouts enable row level security;
alter table disputes enable row level security;
alter table ratings enable row level security;
alter table messages enable row level security;
alter table admin_notes enable row level security;
alter table audit_events enable row level security;
alter table prohibited_item_reports enable row level security;
