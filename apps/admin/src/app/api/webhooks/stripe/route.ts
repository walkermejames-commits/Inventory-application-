import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe, supabase } from "@/lib/server";
import { shouldProcessWebhook } from "@door-in-four/shared";

async function markBookingPaid(bookingId: string, metadata: Record<string, unknown>) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id,status,payment_status")
    .eq("id", bookingId)
    .single();

  if (!booking) return;

  if (!shouldProcessWebhook(booking.payment_status, "paid")) return;

  await supabase
    .from("bookings")
    .update({
      payment_status: "paid",
      status: "paid_awaiting_dispatch"
    })
    .eq("id", bookingId);

  await supabase.from("status_events").insert({
    booking_id: bookingId,
    previous_status: booking.status || "awaiting_payment",
    new_status: "paid_awaiting_dispatch",
    actor_role: "system",
    note: "Stripe payment confirmed"
  });

  await supabase.from("audit_events").insert({
    actor_role: "system",
    action: "payment_confirmed",
    entity_type: "booking",
    entity_id: bookingId,
    metadata
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const bookingId = intent.metadata.booking_id;

    if (bookingId) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id,status")
        .eq("stripe_payment_intent_id", intent.id)
        .single();

      if (shouldProcessWebhook(existing?.status, "paid")) {
        if (existing?.id) {
          await supabase
            .from("payments")
            .update({
              status: "paid",
              stripe_charge_id: String(intent.latest_charge ?? "")
            })
            .eq("id", existing.id);
        }

        await markBookingPaid(bookingId, {
          stripe_payment_intent_id: intent.id,
          stripe_charge_id: String(intent.latest_charge ?? "")
        });
      }
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id || session.metadata?.bookingId;

    if (bookingId) {
      const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : null;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

      await supabase
        .from("payments")
        .upsert(
          {
            booking_id: bookingId,
            stripe_payment_intent_id: paymentIntentId,
            amount,
            currency: session.currency || "gbp",
            status: "paid"
          },
          { onConflict: "booking_id" }
        );

      await markBookingPaid(bookingId, {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        amount_total: session.amount_total,
        currency: session.currency
      });
    }
  }

  return NextResponse.json({ received: true });
}
