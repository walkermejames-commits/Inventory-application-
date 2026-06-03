import { NextResponse } from "next/server";
import { requireDriverRequest } from "@/lib/api-security";
import { mobileBookingSelect, toMobileBooking } from "@/lib/mobile-booking";
import { supabase } from "@/lib/server";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

const progression = [
  "driver_en_route_to_pickup",
  "driver_arrived_at_pickup",
  "pickup_verified",
  "item_collected",
  "driver_en_route_to_delivery",
  "driver_arrived_at_delivery",
  "delivery_verified",
  "delivered",
];

function isNextStatus(currentStatus: string, toStatus: string) {
  const currentIndex = progression.indexOf(currentStatus);

  return currentIndex >= 0 && progression[currentIndex + 1] === toStatus;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params;
    const body = await request.json();
    const driverId = typeof body.driverId === "string" ? body.driverId : "";
    const toStatus = typeof body.toStatus === "string" ? body.toStatus : "";

    if (!driverId || !toStatus) {
      return NextResponse.json({ error: "driverId and toStatus are required" }, { status: 400 });
    }

    const auth = await requireDriverRequest(request, driverId);
    if (auth.ok === false) return auth.response;

    const { data: booking, error: lookupError } = await supabase
      .from("bookings")
      .select("id,status,driver_id")
      .eq("id", bookingId)
      .single();

    if (lookupError || !booking) {
      return NextResponse.json({ error: lookupError?.message || "Booking not found" }, { status: 404 });
    }

    if (booking.driver_id !== driverId) {
      return NextResponse.json({ error: "This job is not assigned to this driver" }, { status: 403 });
    }

    if (!isNextStatus(booking.status, toStatus)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status: toStatus })
      .eq("id", bookingId)
      .select(`driver_id,${mobileBookingSelect}`)
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Could not update job status" }, { status: 400 });
    }

    await supabase.from("status_events").insert({
      booking_id: bookingId,
      previous_status: booking.status,
      new_status: toStatus,
      actor_role: "driver",
      note: "Driver progress update",
      metadata: {
        driver_id: driverId,
        // TODO: attach proof upload metadata here when native uploads exist:
        // pickup_proof_path, delivery_proof_path, captured_at, gps_lat, gps_lng.
        proof: body.proof || null,
      },
    });

    return NextResponse.json({ success: true, booking: toMobileBooking(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
