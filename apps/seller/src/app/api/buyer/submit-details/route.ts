import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { calculateQuote } from "@door-in-four/pricing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      token,
      buyerName,
      buyerPhone,
      buyerEmail,
      deliveryTown,
      deliveryPostcode,
      deliveryAddressLine,
      deliveryAddress,
      stairs,
      accessNotes,
      deliveryNotes,
    } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        pickup_contacts (*)
      `)
      .eq("private_buyer_token_hash", tokenHash)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    const pickup = Array.isArray(booking.pickup_contacts)
      ? booking.pickup_contacts[0]
      : booking.pickup_contacts;

    const { data: deliveryAddressRow, error: deliveryError } = await supabase
      .from("delivery_addresses")
      .insert({
        booking_id: booking.id,
        town: deliveryTown,
        postcode: deliveryPostcode,
        address_line: deliveryAddressLine || deliveryAddress || null,
        stairs_floors: Number(stairs || 0),
        access_notes: [accessNotes, deliveryNotes].filter(Boolean).join(" | ") || null,
      })
      .select("id, town, postcode")
      .single();

    if (deliveryError || !deliveryAddressRow) {
      return NextResponse.json({ error: deliveryError?.message || "Could not create delivery address" }, { status: 400 });
    }

    const quote = calculateQuote({
      routeDistanceMiles: 8,
      routeDurationMinutes: 25,
      itemSize: booking.item_size || "medium",
      approximateWeightKg: booking.approximate_weight_kg || 20,
      quantity: 1,
      urgency: "scheduled",
      requiresVan: booking.requires_van || false,
      fragile: booking.fragile || false,
      pickupStairsFloors: 0,
      deliveryStairsFloors: Number(stairs || 0),
      requiresTwoPeople: booking.requires_two_people || false,
      sameTown: pickup?.town === deliveryTown,
    });

    const buyerNotes = [
      buyerName ? `Buyer: ${buyerName}` : null,
      buyerPhone ? `Phone: ${buyerPhone}` : null,
      buyerEmail ? `Email: ${buyerEmail}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        delivery_address_id: deliveryAddressRow.id,
        delivery_quote_amount: quote.totalBuyerPrice,
        status: "seller_quote_pending",
        delivery_notes: buyerNotes || null,
      })
      .eq("id", booking.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      redirectTo: `/quote/${booking.id}`,
      quoteAmount: quote.totalBuyerPrice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit delivery details";
    console.error("Submit delivery details error", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
