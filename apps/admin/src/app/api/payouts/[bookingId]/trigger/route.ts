import { NextResponse } from "next/server";
import { stripe, supabase, env } from "@/lib/server";

export async function POST(request: Request, { params }: { params: { bookingId: string } }) {
  const { actorUserId } = await request.json();
  const { data: booking } = await supabase.from("bookings").select("id,status,driver_id,driver_payout_amount").eq("id", params.bookingId).single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "completed") return NextResponse.json({ error: "Payout blocked: booking not completed" }, { status: 400 });

  const { data: driverProfile } = await supabase.from("driver_profiles").select("stripe_connect_account_id").eq("user_id", booking.driver_id).single();
  if (!driverProfile?.stripe_connect_account_id || !env.STRIPE_CONNECT_CLIENT_ID) {
    return NextResponse.json({ error: "Payout blocked: driver Stripe Connect account missing or STRIPE_CONNECT_CLIENT_ID not configured" }, { status: 400 });
  }

  const transfer = await stripe.transfers.create({
    amount: Math.round(Number(booking.driver_payout_amount) * 100),
    currency: "gbp",
    destination: driverProfile.stripe_connect_account_id,
    metadata: { booking_id: booking.id }
  });

  await supabase.from("payouts").upsert({
    booking_id: booking.id,
    driver_id: booking.driver_id,
    stripe_connect_account_id: driverProfile.stripe_connect_account_id,
    stripe_transfer_id: transfer.id,
    amount: booking.driver_payout_amount,
    currency: "gbp",
    status: "payout_sent"
  }, { onConflict: "booking_id" });

  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    actor_role: "admin",
    action: "payout_sent",
    entity_type: "booking",
    entity_id: booking.id,
    metadata: { transfer_id: transfer.id }
  });

  return NextResponse.json({ success: true, transferId: transfer.id });
}
