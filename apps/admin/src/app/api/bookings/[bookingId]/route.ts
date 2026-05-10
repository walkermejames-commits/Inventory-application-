import { NextResponse } from "next/server";
import { isStatusTransitionAllowed } from "@door-in-four/shared";
import { supabase } from "@/lib/server";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const { toStatus, actorUserId, actorRole, note, metadata } = await request.json();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (!isStatusTransitionAllowed(booking.status, toStatus)) {
    return NextResponse.json({ error: "Transition denied" }, { status: 400 });
  }

  await supabase.from("bookings").update({ status: toStatus }).eq("id", bookingId);

  await supabase.from("status_events").insert({
    booking_id: bookingId,
    previous_status: booking.status,
    new_status: toStatus,
    actor_user_id: actorUserId,
    actor_role: actorRole,
    note,
    metadata
  });

  if (actorRole === "admin") {
    await supabase.from("audit_events").insert({
      actor_user_id: actorUserId,
      actor_role: actorRole,
      action: "manual_status_override",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: { from: booking.status, to: toStatus, note, metadata }
    });
  }

  return NextResponse.json({ success: true });
}
