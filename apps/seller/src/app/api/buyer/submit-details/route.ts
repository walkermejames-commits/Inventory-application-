import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const { token, buyerName, buyerPhone, buyerEmail, deliveryTown, deliveryPostcode, deliveryAddress, preferredDeliveryWindow, stairsNotes, deliveryNotes } = await request.json();

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find the pickup contact by token
  const { data: contact } = await supabase
    .from("pickup_contacts")
    .select("id")
    .eq("secure_token_hash", tokenHash)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  // Update or create delivery address
  const { data: deliveryContact } = await supabase
    .from("delivery_contacts")
    .insert({
      town: deliveryTown,
      postcode: deliveryPostcode,
      address_line: deliveryAddress,
      notes: `${stairsNotes} ${deliveryNotes}`.trim(),
    })
    .select("id")
    .single();

  // Update the booking with buyer details and move to next status
  const { error } = await supabase
    .from("bookings")
    .update({
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail || null,
      delivery_contact_id: deliveryContact?.id,
      scheduled_delivery_start: preferredDeliveryWindow ? new Date().toISOString() : null, // simplified
      status: "buyer_details_submitted",
      delivery_notes: deliveryNotes || null,
    })
    .eq("pickup_contact_id", contact.id)
    .eq("status", "seller_quote_pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}