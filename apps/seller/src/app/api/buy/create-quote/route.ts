import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateQuote } from "@door-in-four/pricing";
import { estimateRouteFromPostcodes } from "@/lib/geography";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const asNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: unknown) => value === true || value === "true" || value === "on";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pickupTown = String(body.pickupTown || "").trim();
    const pickupPostcode = String(body.pickupPostcode || "").trim();
    const deliveryTown = String(body.deliveryTown || "").trim();
    const deliveryPostcode = String(body.deliveryPostcode || "").trim();
    const itemTitle = String(body.itemTitle || "Marketplace item").trim();
    const itemSize = String(body.itemSize || "medium");
    const approximateWeightKg = asNumber(body.approximateWeightKg, 20);
    const urgency = String(body.urgency || "scheduled");
    const pickupStairsFloors = asNumber(body.pickupStairsFloors, 0);
    const deliveryStairsFloors = asNumber(body.deliveryStairsFloors, 0);

    if (!pickupTown || !pickupPostcode || !deliveryTown || !deliveryPostcode) {
      return NextResponse.json({ error: "Pickup and delivery town/postcode are required" }, { status: 400 });
    }

    const route = await estimateRouteFromPostcodes(pickupPostcode, deliveryPostcode);

    const { data: pickup, error: pickupError } = await supabase
      .from("pickup_contacts")
      .insert({
        seller_name: body.sellerName || "Marketplace seller",
        seller_phone: body.sellerPhone || "",
        seller_email: body.sellerEmail || "",
        town: pickupTown,
        postcode: pickupPostcode,
        address_line_1: body.pickupAddress || "",
        address_line: body.pickupAddress || null,
        notes: body.pickupNotes || null,
      })
      .select("id")
      .single();

    if (pickupError || !pickup) {
      return NextResponse.json({ error: pickupError?.message || "Could not create pickup details" }, { status: 400 });
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("delivery_addresses")
      .insert({
        recipient_name: body.buyerName || "Buyer",
        recipient_phone: body.buyerPhone || "",
        town: deliveryTown,
        postcode: deliveryPostcode,
        address_line_1: body.deliveryAddress || "",
        notes: body.deliveryNotes || null,
      })
      .select("id")
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json({ error: deliveryError?.message || "Could not create delivery details" }, { status: 400 });
    }

    const quote = calculateQuote({
      routeDistanceMiles: route.distanceMiles,
      routeDurationMinutes: route.durationMinutes,
      itemSize: itemSize as any,
      approximateWeightKg,
      quantity: 1,
      urgency: urgency as any,
      requiresVan: asBoolean(body.requiresVan),
      fragile: asBoolean(body.fragile),
      pickupStairsFloors,
      deliveryStairsFloors,
      requiresTwoPeople: asBoolean(body.requiresTwoPeople),
      sameTown: pickupTown.toLowerCase() === deliveryTown.toLowerCase(),
    });

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        pickup_contact_id: pickup.id,
        delivery_address_id: delivery.id,
        status: "seller_quote_pending",
        payment_status: "quote_created",
        item_title: itemTitle,
        item_size: itemSize,
        approximate_weight_kg: approximateWeightKg,
        fragile: asBoolean(body.fragile),
        requires_two_people: asBoolean(body.requiresTwoPeople),
        requires_van: asBoolean(body.requiresVan),
        preferred_pickup_window: body.preferredPickupWindow || null,
        delivery_quote_amount: quote.totalBuyerPrice,
        driver_payout_amount: quote.driverPayoutEstimate,
        platform_fee_amount: quote.platformServiceFee,
        seller_flow_type: "buyer_led",
        pickup_latitude: route.pickupLat,
        pickup_longitude: route.pickupLng,
        delivery_latitude: route.deliveryLat,
        delivery_longitude: route.deliveryLng,
        route_distance_miles: route.distanceMiles,
        route_duration_minutes: route.durationMinutes,
        route_estimated: route.estimated,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: bookingError?.message || "Could not create booking" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      quoteAmount: quote.totalBuyerPrice,
      route,
      redirectTo: `/quote/${booking.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create buyer quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
