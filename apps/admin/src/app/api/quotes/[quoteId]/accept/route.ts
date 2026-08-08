import { NextResponse } from "next/server";
import { canPayQuote, calculateDriverPayout } from "@door-in-four/shared";
import { supabase } from "@/lib/server";
import { generateCode, hashCode } from "@/lib/security";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ quoteId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { quoteId } = await context.params;

  const {
    pickupContactId,
    deliveryAddressId,
    buyerId,
    scheduledCollectionStart,
    scheduledCollectionEnd,
    itemTitle,
    itemSize,
  } = await request.json();

  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  if (!canPayQuote(quote.expires_at)) {
    await supabase.from("quotes").update({ status: "quote_expired" }).eq("id", quote.id);
    return NextResponse.json({ error: "Quote expired" }, { status: 400 });
  }

  const sellerCode = generateCode();
  const buyerCode = generateCode();
  const driverPayout =
    quote.driver_payout_estimate ?? calculateDriverPayout(Number(quote.subtotal));

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      quote_id: quote.id,
      buyer_id: buyerId,
      pickup_contact_id: pickupContactId,
      delivery_address_id: deliveryAddressId,
      status: "awaiting_payment",
      payment_status: "payment_pending",
      accepted_price: quote.total_price,
      delivery_quote_amount: quote.total_price,
      driver_payout_amount: driverPayout,
      platform_fee_amount: quote.platform_fee,
      scheduled_collection_start: scheduledCollectionStart,
      scheduled_collection_end: scheduledCollectionEnd,
      seller_handover_code_hash: hashCode(sellerCode),
      buyer_delivery_code_hash: hashCode(buyerCode),
      item_title: itemTitle || quote.item_summary || "Delivery item",
      item_size: itemSize || null,
      seller_flow_type: "admin_quote",
      route_distance_miles: quote.route_distance_miles,
      route_duration_minutes: quote.route_duration_minutes,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from("quotes")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", quote.id);

  await supabase.from("status_events").insert({
    booking_id: booking.id,
    new_status: "awaiting_payment",
    actor_role: "buyer",
    actor_user_id: buyerId || auth.actorUserId,
    note: "Quote accepted",
  });

  return NextResponse.json({ booking, sellerCode, buyerCode });
}
