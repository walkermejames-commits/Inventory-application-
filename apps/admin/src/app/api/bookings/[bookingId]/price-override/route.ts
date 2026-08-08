import { NextResponse } from "next/server";
import { calculateDriverPayoutAmount } from "@door-in-four/types";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { bookingId } = await context.params;
  const body = await request.json();
  const newAcceptedPrice = Number(body.newAcceptedPrice);
  const reason = body.reason;
  const actorUserId = auth.actorUserId || body.actorUserId || null;

  if (!Number.isFinite(newAcceptedPrice) || newAcceptedPrice <= 0) {
    return NextResponse.json({ error: "newAcceptedPrice must be a positive number" }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("status,payment_status,accepted_price")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (booking.payment_status !== "payment_pending" && booking.status !== "awaiting_payment") {
    return NextResponse.json(
      { error: "Price override only allowed before payment" },
      { status: 400 }
    );
  }

  const driverPayout = calculateDriverPayoutAmount(newAcceptedPrice);

  await supabase
    .from("bookings")
    .update({
      accepted_price: newAcceptedPrice,
      delivery_quote_amount: newAcceptedPrice,
      driver_payout_amount: driverPayout,
    })
    .eq("id", bookingId);

  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    actor_role: "admin",
    action: "price_override",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: {
      oldPrice: booking.accepted_price,
      newPrice: newAcceptedPrice,
      driverPayout,
      reason,
      authMode: auth.mode,
    },
  });

  return NextResponse.json({ success: true, driverPayout });
}
