import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const generateToken = () => crypto.randomBytes(16).toString("hex");
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = generateToken();
    const tokenHash = hashToken(token);

    const { data: contact, error: contactError } = await supabase
      .from("pickup_contacts")
      .insert({
        seller_name: body.sellerName,
        seller_email: body.sellerEmail,
        email: body.sellerEmail,
        seller_phone: body.sellerPhone || "",
        phone: body.sellerPhone || null,
        town: body.pickupTown,
        postcode: body.pickupPostcode,
        address_line: body.pickupAddress || null,
        address_line_1: body.pickupAddress || "",
        secure_token_hash: tokenHash,
        notes: `Item: ${body.itemTitle} | Size: ${body.itemSize} | Weight: ${body.approximateWeightKg}kg | Fragile: ${body.fragile} | TwoPeople: ${body.needsTwoPeople} | Van: ${body.needsVan} | Windows: ${body.preferredPickupWindows}`,
      })
      .select("id")
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: contactError?.message || "Could not create pickup contact" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        pickup_contact_id: contact.id,
        status: "seller_quote_pending",
        item_title: body.itemTitle,
        item_size: body.itemSize,
        approximate_weight_kg: body.approximateWeightKg,
        fragile: body.fragile,
        requires_two_people: body.needsTwoPeople,
        requires_van: body.needsVan,
        preferred_pickup_window: body.preferredPickupWindows || null,
        seller_confirmed_item_payment: true,
        private_buyer_token_hash: tokenHash,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: bookingError?.message || "Could not create booking" }, { status: 400 });
    }

    const sellerBaseUrl = process.env.NEXT_PUBLIC_SELLER_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";
    const buyerLink = `${sellerBaseUrl}/buyer/${token}`;
    const messengerText = `Hi, I can arrange delivery through Door in Four for the ${body.itemTitle}. Please add your delivery details here: ${buyerLink}\n\nItem payment is still between us. This link is just for delivery, and you will see the delivery quote before paying.`;

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      buyerLink,
      messengerText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create buyer link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
