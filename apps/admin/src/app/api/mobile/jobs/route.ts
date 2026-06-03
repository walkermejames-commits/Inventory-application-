import { NextResponse } from "next/server";
import { requireDriverRequest } from "@/lib/api-security";
import { mobileBookingSelect, toMobileBooking } from "@/lib/mobile-booking";
import { supabase } from "@/lib/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }
    const auth = await requireDriverRequest(request, driverId);
    if (auth.ok === false) return auth.response;

    const { data, error } = await supabase
      .from("bookings")
      .select(mobileBookingSelect)
      .eq("driver_id", driverId)
      .in("status", [
        "driver_assigned",
        "driver_en_route_to_pickup",
        "driver_arrived_at_pickup",
        "pickup_verified",
        "item_collected",
        "driver_en_route_to_delivery",
        "driver_arrived_at_delivery",
        "delivery_verified"
      ])
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const jobs = (data || []).map(toMobileBooking);

    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
