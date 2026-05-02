import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadDbEnv } from "@door-in-four/config";

const env = loadDbEnv(process.env);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const users = {
  admin: { email: "admin@doorinfour.local", role: "admin", phone: "+447700900001", full_name: "Launch Admin" },
  buyer: { email: "buyer@doorinfour.local", role: "buyer", phone: "+447700900002", full_name: "Tunbridge Buyer" },
  driverApproved: { email: "driver.approved@doorinfour.local", role: "driver", phone: "+447700900003", full_name: "Approved Driver" },
  driverPending: { email: "driver.pending@doorinfour.local", role: "driver", phone: "+447700900004", full_name: "Pending Driver" }
};

async function upsertUser(user) {
  const { data, error } = await supabase.from("users").upsert(user, { onConflict: "email" }).select("id,email").single();
  if (error) throw error;
  return data;
}

const admin = await upsertUser(users.admin);
const buyer = await upsertUser(users.buyer);
const approvedDriver = await upsertUser(users.driverApproved);
const pendingDriver = await upsertUser(users.driverPending);

await supabase.from("buyer_profiles").upsert({ user_id: buyer.id, default_phone: users.buyer.phone, default_address: { town: "Royal Tunbridge Wells" } }, { onConflict: "user_id" });

const { data: approvedProfile } = await supabase
  .from("driver_profiles")
  .upsert({ user_id: approvedDriver.id, status: "approved", current_availability: true, service_radius_miles: 20 }, { onConflict: "user_id" })
  .select("id")
  .single();

await supabase.from("driver_profiles").upsert({ user_id: pendingDriver.id, status: "pending", current_availability: false, service_radius_miles: 15 }, { onConflict: "user_id" });

await supabase
  .from("vehicles")
  .upsert({ driver_id: approvedProfile.id, vehicle_type: "small_van", registration: "DF24VAN", make: "Ford", model: "Transit Connect", colour: "White", active: true }, { onConflict: "registration" });

const launchTowns = [
  "Royal Tunbridge Wells",
  "Southborough",
  "Tonbridge",
  "Paddock Wood",
  "Crowborough",
  "Sevenoaks",
  "Maidstone fringe"
];

for (const town of launchTowns) {
  await supabase.from("towns").upsert({ name: town, county: "Kent", postcode_prefixes: ["TN"], active: true }, { onConflict: "name" });
}

const { data: zone } = await supabase
  .from("service_zones")
  .upsert({ name: "Tunbridge Wells Launch Zone", centre_postcode: "TN1 1RS", centre_lat: 51.1324, centre_lng: 0.2637, radius_miles: 20, active: true }, { onConflict: "name" })
  .select("id")
  .single();

await supabase.from("pricing_rules").upsert([
  { zone_id: zone.id, rule_name: "platform_fee_percent", rule_type: "percentage", value: { value: 12 }, active: true },
  { zone_id: zone.id, rule_name: "small_base_fee", rule_type: "amount", value: { value: 8 }, active: true },
  { zone_id: zone.id, rule_name: "van_surcharge", rule_type: "amount", value: { value: 15 }, active: true }
], { onConflict: "zone_id,rule_name" });

const quoteId = crypto.randomUUID();
await supabase.from("quotes").upsert({
  id: quoteId,
  buyer_id: buyer.id,
  pickup_postcode: "TN9 1DD",
  delivery_postcode: "TN1 1RS",
  route_distance_miles: 7.5,
  route_duration_minutes: 24,
  item_summary: "Furniture sofa",
  quote_breakdown: { totalBuyerPrice: 96 },
  subtotal: 86,
  platform_fee: 10,
  total_price: 96,
  driver_payout_estimate: 64.5,
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  status: "quote_created"
});

const bookingRows = [
  { id: crypto.randomUUID(), quote_id: quoteId, buyer_id: buyer.id, driver_id: null, status: "paid_awaiting_dispatch", payment_status: "paid", accepted_price: 96, platform_fee_amount: 10 },
  { id: crypto.randomUUID(), quote_id: quoteId, buyer_id: buyer.id, driver_id: approvedDriver.id, status: "driver_en_route_to_delivery", payment_status: "paid", accepted_price: 96, platform_fee_amount: 10 },
  { id: crypto.randomUUID(), quote_id: quoteId, buyer_id: buyer.id, driver_id: approvedDriver.id, status: "completed", payment_status: "paid", accepted_price: 96, platform_fee_amount: 10 },
  { id: crypto.randomUUID(), quote_id: quoteId, buyer_id: buyer.id, driver_id: approvedDriver.id, status: "disputed", payment_status: "paid", accepted_price: 96, platform_fee_amount: 10 }
];

for (const row of bookingRows) {
  await supabase.from("bookings").upsert(row, { onConflict: "id" });
}

console.log("Seed complete: users, profiles, vehicle, zone, towns, pricing rules, and sample bookings created/upserted.");
console.log(`Admin user: ${users.admin.email}`);
