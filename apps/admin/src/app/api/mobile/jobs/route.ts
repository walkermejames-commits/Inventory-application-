import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

const DRIVER_JOB_STATUSES = [
  "driver_assigned",
  "driver_en_route_to_pickup",
  "driver_arrived_at_pickup",
  "pickup_verified",
  "item_collected",
  "driver_en_route_to_delivery",
  "driver_arrived_at_delivery",
  "delivery_verified",
  "delivered",
  "completed",
] as const;

function mapJob(job: any) {
  const pickup = Array.isArray(job.pickup_contacts)
    ? job.pickup_contacts[0]
    : job.pickup_contacts;
  const delivery = Array.isArray(job.delivery_addresses)
    ? job.delivery_addresses[0]
    : job.delivery_addresses;

  return {
    id: job.id,
    status: job.status,
    payment_status: job.payment_status,
    driver_id: job.driver_id,
    pickup_town: pickup?.town || "Pickup",
    pickup_postcode: pickup?.postcode || null,
    pickup_address_line: pickup?.address_line_1 || null,
    delivery_town: delivery?.town || "Delivery",
    delivery_postcode: delivery?.postcode || null,
    delivery_address_line: delivery?.address_line_1 || null,
    item_title: job.item_title || "Delivery job",
    item_size: job.item_size || "medium",
    approximate_weight_kg: Number(job.approximate_weight_kg || 0),
    fragile: Boolean(job.fragile),
    requires_two_people: Boolean(job.requires_two_people),
    requires_van: Boolean(job.requires_van),
    delivery_quote_amount: job.delivery_quote_amount,
    accepted_price: job.accepted_price,
    driver_payout_amount: job.driver_payout_amount,
    created_at: job.created_at,
    updated_at: job.updated_at ?? null,
  };
}

const selectClause = `
  id,status,payment_status,driver_id,item_title,item_size,approximate_weight_kg,fragile,requires_two_people,requires_van,delivery_quote_amount,accepted_price,driver_payout_amount,created_at,updated_at,
  pickup_contacts (town, postcode, address_line_1),
  delivery_addresses (town, postcode, address_line_1)
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");
    const bookingId = searchParams.get("bookingId");

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const auth = gateMobileApi(request, { expectedDriverId: driverId });
    if (isNextResponse(auth)) return auth;

    // Single job (includes delivered/completed so detail can refresh after final steps)
    if (bookingId) {
      const { data, error } = await supabase
        .from("bookings")
        .select(selectClause)
        .eq("id", bookingId)
        .eq("driver_id", driverId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (!data) {
        return NextResponse.json({ error: "Job not found for this driver" }, { status: 404 });
      }

      return NextResponse.json({ job: mapJob(data) });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(selectClause)
      .eq("driver_id", driverId)
      .in("status", [...DRIVER_JOB_STATUSES])
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const jobs = (data || []).map(mapJob);
    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
