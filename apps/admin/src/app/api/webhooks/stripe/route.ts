import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe, supabase } from "@/lib/server";
import { shouldProcessWebhook } from "@door-in-four/shared";

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

    const { data: existing } = await supabase
      .from("payments")
      .select("id,status")
      .eq("stripe_payment_intent_id", intent.id)
      .single();

    if (shouldProcessWebhook(existing?.status, "paid")) {
      await supabase
        .from("payments")
        .update({
          status: "paid",
          stripe_charge_id: String(intent.latest_charge ?? "")
        })
        .eq("id", existing?.id);

      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "paid_awaiting_dispatch"
        })
        .eq("id", bookingId);

      await supabase.from("status_events").insert({
        booking_id: bookingId,
        previous_status: "awaiting_payment",
        new_status: "paid_awaiting_dispatch",
        actor_role: "system",
        note: "Stripe payment confirmed"
      });

      await supabase.from("audit_events").insert({
        actor_role: "system",
        action: "payment_confirmed",
        entity_type: "booking",
        entity_id: bookingId,
        metadata: {
          stripe_payment_intent_id: intent.id
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
