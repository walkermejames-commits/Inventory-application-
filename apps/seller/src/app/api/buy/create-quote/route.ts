import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateQuote } from "@door-in-four/pricing";
import {
  clampNumber,
  cleanAddress,
  cleanBoolean,
  cleanEmail,
  cleanEnum,
  cleanItemSize,
  cleanItemTitle,
  cleanName,
  cleanNotes,
  cleanPhone,
  cleanPostcode,
  cleanTown,
} from "@door-in-four/shared";
import { estimateRouteFromPostcodes } from "../../../../lib/geography";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const itemSizes = ["small", "medium", "large", "furniture", "van_load"] as const;
const urgencies = ["flexible", "scheduled", "tomorrow", "same_day", "asap"] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pickupTown = cleanTown(body.pickupTown);
    const pickupPostcode = cleanPostcode(body.pickupPostcode);
    const deliveryTown = cleanTown(body.deliveryTown);
    const deliveryPostcode = cleanPostcode(body.deliveryPostcode);
    const itemTitle = cleanItemTitle(body.itemTitle) || "Marketplace item";
    const itemSize = cleanEnum(cleanItemSize(body.itemSize), itemSizes, "medium");
    const approximateWeightKg = clampNumber(body.approximateWeightKg, 0, 500, 20);
    const urgency = cleanEnum(body.urgency, urgencies, "scheduled");
    const pickupStairsFloors = clampNumber(body.pickupStairsFloors, 0, 20, 0);
    const deliveryStairsFloors = clampNumber(body.deliveryStairsFloors, 0, 20, 0);
    const sellerName = cleanName(body.sellerName) || "Marketplace seller";
    const sellerEmail = cleanEmail(body.sellerEmail);
    const sellerPhone = cleanPhone(body.sellerPhone);
    const pickupAddress = cleanAddress(body.pickupAddress);
    const pickupNotes = cleanNotes(body.pickupNotes);
    const buyerName = cleanName(body.buyerName) || "Buyer";
    const buyerPhone = cleanPhone(body.buyerPhone);
    const deliveryAddress = cleanAddress(body.deliveryAddress);
    const deliveryNotes = cleanNotes(body.deliveryNotes);
    const preferredPickupWindow = cleanNotes(body.preferredPickupWindow);
    const fragile = cleanBoolean(body.fragile);
    const requiresTwoPeople = cleanBoolean(body.requiresTwoPeople);
    const requiresVan = cleanBoolean(body.requiresVan);

    if (!pickupTown || !pickupPostcode || !deliveryTown || !deliveryPostcode) {
      return NextResponse.json({ error: "Pickup and delivery town/postcode are required" }, { status: 400 });
    }

    const route = await estimateRouteFromPostcodes(pickupPostcode, deliveryPostcode);

    const { data: pickup, error: pickupError } = await supabase
      .from("pickup_contacts")
      .insert({
        seller_name: sellerName,
        seller_phone: sellerPhone,
        seller_email: sellerEmail,
        town: pickupTown,
        postcode: pickupPostcode,
        address_line_1: pickupAddress,
        address_line: pickupAddress || null,
        notes: pickupNotes || null,
      })
      .select("id")
      .single();

    if (pickupError || !pickup) {
      return NextResponse.json({ error: pickupError?.message || "Could not create pickup details" }, { status: 400 });
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("delivery_addresses")
      .insert({
        recipient_name: buyerName,
        recipient_phone: buyerPhone,
        town: deliveryTown,
        postcode: deliveryPostcode,
        address_line_1: deliveryAddress,
        notes: deliveryNotes || null,
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
      requiresVan,
      fragile,
      pickupStairsFloors,
      deliveryStairsFloors,
      requiresTwoPeople,
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
        fragile,
        requires_two_people: requiresTwoPeople,
        requires_van: requiresVan,
        preferred_pickup_window: preferredPickupWindow || null,
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
