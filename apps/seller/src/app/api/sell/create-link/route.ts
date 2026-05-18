import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const generateToken = () => crypto.randomBytes(16).toString("hex");

export async function POST(request: Request) {
  const body = await request.json();

  const token = generateToken();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // TODO: In production, create a proper "seller_delivery_requests" table
  // For MVP we store minimal data in pickup_contacts + bookings with special status
  const { data: contact, error: contactError } = await supabase
    .from("pickup_contacts")
    .insert({
      seller_name: body.sellerName,
      // email removed - column may not exist in schema
      phone: body.sellerPhone || null,
      town: body.pickupTown,
      postcode: body.pickupPostcode,
      // address_line removed - column doesn't exist
      notes: `Item: ${body.itemTitle} | Size: ${body.itemSize} | Weight: ${body.approximateWeightKg}kg | Fragile: ${body.fragile} | TwoPeople: ${body.needsTwoPeople} | Van: ${body.needsVan} | Windows: ${body.preferredPickupWindows}`,
    })
    .select("id")
    .single();

  if (contactError) {
    return NextResponse.json({ error: contactError.message }, { status: 400 });
  }

  // Create a draft booking linked to this contact
  const { error: bookingError } = await supabase.from("bookings").insert({
    pickup_contact_id: contact.id,
    status: "seller_quote_pending",
    item_title: body.itemTitle,
    item_size: body.itemSize,
    approximate_weight_kg: body.approximateWeightKg,
    fragile: body.fragile,
    requires_two_people: body.needsTwoPeople,
    requires_van: body.needsVan,
    seller_confirmed_item_payment: true,
  });

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 400 });
  }

  const buyerLink = `${process.env.NEXT_PUBLIC_SELLER_URL || "http://localhost:3002"}/buyer/${token}`;

  const messengerText = `Hi, I can arrange delivery through Door in Four for the ${body.itemTitle}. Please add your delivery details here: ${buyerLink}

Item payment is still between us — this link is just for delivery.`;

  return NextResponse.json({
    success: true,
    buyerLink,
    messengerText,
    token,
  });
}