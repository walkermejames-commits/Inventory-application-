import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function POST(request: Request) {
  const { bookingId, driverId, actorUserId } = await request.json();
  const { data: booking } = await supabase.from("bookings").select("status,payment_status").eq("id", bookingId).single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.payment_status !== "paid" || booking.status !== "paid_awaiting_dispatch") {
    return NextResponse.json({ error: "Booking must be paid before dispatch" }, { status: 400 });
  }

  const { error } = await supabase.from("bookings").update({ driver_id: driverId, status: "driver_assigned" }).eq("id", bookingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("status_events").insert({
    booking_id: bookingId,
    previous_status: "paid_awaiting_dispatch",
    new_status: "driver_assigned",
    actor_user_id: actorUserId,
    actor_role: "admin",
    note: "Driver manually assigned"
  });
  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    actor_role: "admin",
    action: "driver_assigned",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: { driverId }
  });

  return NextResponse.json({ success: true });
}
