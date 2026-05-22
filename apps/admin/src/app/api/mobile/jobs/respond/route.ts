import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const driverId = typeof body.driverId === "string" ? body.driverId : "";
    const response = body.response === "accepted" || body.response === "rejected" ? body.response : "";

    if (!bookingId || !driverId || !response) {
      return NextResponse.json({ error: "bookingId, driverId and response are required" }, { status: 400 });
    }

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

    if (booking.status !== "driver_assigned") {
      return NextResponse.json({ error: "Only newly assigned jobs can be accepted or rejected" }, { status: 400 });
    }

    if (response === "rejected") {
      const { data: updated, error: updateError } = await supabase
        .from("bookings")
        .update({
          driver_id: null,
          status: "paid_awaiting_dispatch",
        })
        .eq("id", bookingId)
        .select("id,status,driver_id")
        .single();

      if (updateError || !updated) {
        return NextResponse.json({ error: updateError?.message || "Could not reject job" }, { status: 400 });
      }

      await supabase.from("status_events").insert({
        booking_id: bookingId,
        previous_status: "driver_assigned",
        new_status: "paid_awaiting_dispatch",
        actor_role: "driver",
        note: `Driver ${driverId} rejected assignment`,
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status: "driver_en_route_to_pickup" })
      .eq("id", bookingId)
      .select("id,status,driver_id")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Could not accept job" }, { status: 400 });
    }

    await supabase.from("status_events").insert({
      booking_id: bookingId,
      previous_status: "driver_assigned",
      new_status: "driver_en_route_to_pickup",
      actor_role: "driver",
      note: `Driver ${driverId} accepted assignment`,
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not respond to job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
