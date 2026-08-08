import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { bookingId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const disputeType =
    typeof body.disputeType === "string" ? body.disputeType.trim() : "general";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const openedByUserId = auth.actorUserId || null;

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { error } = await supabase.from("disputes").insert({
    booking_id: bookingId,
    opened_by_user_id: openedByUserId,
    dispute_type: disputeType,
    description,
    status: "open",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: statusError } = await supabase
    .from("bookings")
    .update({ status: "disputed" })
    .eq("id", bookingId);

  if (statusError) {
    return NextResponse.json(
      { error: `Dispute created but booking status update failed: ${statusError.message}` },
      { status: 500 }
    );
  }

  const { error: eventError } = await supabase.from("status_events").insert({
    booking_id: bookingId,
    previous_status: booking.status,
    new_status: "disputed",
    actor_user_id: openedByUserId,
    actor_role: "admin",
    note: `Dispute opened: ${disputeType}`,
  });

  if (eventError) {
    return NextResponse.json(
      { error: `Dispute recorded but status event failed: ${eventError.message}` },
      { status: 500 }
    );
  }

  await supabase.from("audit_events").insert({
    actor_user_id: openedByUserId,
    actor_role: "admin",
    action: "dispute_opened",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: { disputeType, authMode: auth.mode },
  });

  return NextResponse.json({ success: true });
}
