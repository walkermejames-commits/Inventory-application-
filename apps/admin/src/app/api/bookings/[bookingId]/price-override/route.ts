import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function POST(request: Request, { params }: { params: { bookingId: string } }) {
  const { newAcceptedPrice, actorUserId, reason } = await request.json();
  const { data: booking } = await supabase.from("bookings").select("status,payment_status,accepted_price").eq("id", params.bookingId).single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.payment_status !== "payment_pending" && booking.status !== "awaiting_payment") {
    return NextResponse.json({ error: "Price override only allowed before payment" }, { status: 400 });
  }

  await supabase.from("bookings").update({ accepted_price: newAcceptedPrice, driver_payout_amount: Number(newAcceptedPrice) * 0.75 }).eq("id", params.bookingId);
  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    actor_role: "admin",
    action: "price_override",
    entity_type: "booking",
    entity_id: params.bookingId,
    metadata: { oldPrice: booking.accepted_price, newPrice: newAcceptedPrice, reason }
  });

  return NextResponse.json({ success: true });
}
