import { NextResponse } from "next/server";
import { canDispatch } from "@door-in-four/shared";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const bookingId = body.bookingId as string;
  const driverId = body.driverId as string;
  const actorUserId = auth.actorUserId || body.actorUserId || null;

  const { data: booking } = await supabase
    .from("bookings")
    .select("status,payment_status")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (!canDispatch(booking.payment_status, booking.status)) {
    return NextResponse.json(
      { error: "Booking must be paid and awaiting dispatch" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("bookings")
    .update({ driver_id: driverId, status: "driver_assigned" })
    .eq("id", bookingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("status_events").insert({
    booking_id: bookingId,
    previous_status: "paid_awaiting_dispatch",
    new_status: "driver_assigned",
    actor_user_id: actorUserId,
    actor_role: "admin",
    note: "Driver manually assigned",
  });
  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    actor_role: "admin",
    action: "driver_assigned",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: { driverId, authMode: auth.mode },
  });

  return NextResponse.json({ success: true });
}
