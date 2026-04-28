import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { generateCode, hashCode } from "@/lib/security";

export async function POST(request: Request, { params }: { params: { quoteId: string } }) {
  const { pickupContactId, deliveryAddressId, buyerId, scheduledCollectionStart, scheduledCollectionEnd } = await request.json();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", params.quoteId).single();
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (new Date(quote.expires_at).getTime() <= Date.now()) {
    await supabase.from("quotes").update({ status: "quote_expired" }).eq("id", quote.id);
    return NextResponse.json({ error: "Quote expired" }, { status: 400 });
  }

  const sellerCode = generateCode();
  const buyerCode = generateCode();

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
      driver_payout_amount: quote.driver_payout_estimate,
      platform_fee_amount: quote.platform_fee,
      scheduled_collection_start: scheduledCollectionStart,
      scheduled_collection_end: scheduledCollectionEnd,
      seller_handover_code_hash: hashCode(sellerCode),
      buyer_delivery_code_hash: hashCode(buyerCode)
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("quotes").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", quote.id);
  await supabase.from("status_events").insert({
    booking_id: booking.id,
    new_status: "awaiting_payment",
    actor_role: "buyer",
    actor_user_id: buyerId,
    note: "Quote accepted"
  });

  return NextResponse.json({ booking, sellerCode, buyerCode });
}
