import { NextResponse } from "next/server";
import { stripe, supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { bookingId, email, buyerId } = await request.json();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id,quote_id,accepted_price,delivery_quote_amount,status,payment_status")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "awaiting_payment") {
    return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 400 });
  }

  const price = Number(booking.accepted_price ?? booking.delivery_quote_amount);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Booking has no payable price" }, { status: 400 });
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { booking_id: booking.id, buyer_id: buyerId },
  });
  const amountPence = Math.round(price * 100);
  const intent = await stripe.paymentIntents.create({
    amount: amountPence,
    currency: "gbp",
    customer: customer.id,
    metadata: {
      booking_id: booking.id,
      quote_id: booking.quote_id || "",
      buyer_id: buyerId || "",
    },
  });

  await supabase.from("payments").upsert(
    {
      booking_id: bookingId,
      stripe_customer_id: customer.id,
      stripe_payment_intent_id: intent.id,
      amount: price,
      currency: "gbp",
      status: "payment_pending",
    },
    { onConflict: "booking_id" }
  );

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amountPence,
  });
}
