import { NextResponse } from "next/server";
import { stripe, supabase } from "@/lib/server";

export async function POST(request: Request) {
  const { bookingId, email, buyerId } = await request.json();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id,quote_id,accepted_price,status,payment_status")
    .eq("id", bookingId)
    .single();

  if (error || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "awaiting_payment") return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 400 });

  const customer = await stripe.customers.create({ email, metadata: { booking_id: booking.id, buyer_id: buyerId } });
  const amountPence = Math.round(Number(booking.accepted_price) * 100);
  const intent = await stripe.paymentIntents.create({
    amount: amountPence,
    currency: "gbp",
    customer: customer.id,
    metadata: { booking_id: booking.id, quote_id: booking.quote_id, buyer_id: buyerId }
  });

  await supabase.from("payments").upsert({
    booking_id: bookingId,
    stripe_customer_id: customer.id,
    stripe_payment_intent_id: intent.id,
    amount: booking.accepted_price,
    currency: "gbp",
    status: "payment_pending"
  }, { onConflict: "stripe_payment_intent_id" });

  return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, amountPence });
}
