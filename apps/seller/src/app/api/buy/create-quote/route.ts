import { NextResponse } from "next/server";
import { calculateQuote } from "@door-in-four/pricing";
import { supabase } from "@/src/lib/server";
import {
  calculateDriverPayoutAmount,
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
import {
  generateAccessToken,
  hashAccessToken,
} from "@/src/lib/booking-access";

const itemSizes = ["small", "medium", "large", "furniture", "van_load"] as const;
const urgencies = ["flexible", "scheduled", "tomorrow", "same_day", "asap"] as const;

/**
 * Buyer-led quote creation — single canonical model:
 * pickup + delivery rows → quotes row → bookings row (quote_id linked)
 * status starts at seller_quote_pending (open quote) with payment_status quote_created.
 */
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
    const buyerEmail = cleanEmail(body.buyerEmail);
    const deliveryAddress = cleanAddress(body.deliveryAddress);
    const deliveryNotes = cleanNotes(body.deliveryNotes);
    const preferredPickupWindow = cleanNotes(body.preferredPickupWindow);
    const fragile = cleanBoolean(body.fragile);
    const requiresTwoPeople = cleanBoolean(body.requiresTwoPeople);
    const requiresVan = cleanBoolean(body.requiresVan);

    if (!pickupTown || !pickupPostcode || !deliveryTown || !deliveryPostcode) {
      return NextResponse.json(
        { error: "Pickup and delivery town/postcode are required" },
        { status: 400 }
      );
    }

    const route = await estimateRouteFromPostcodes(pickupPostcode, deliveryPostcode);

    const { data: pickup, error: pickupError } = await supabase
      .from("pickup_contacts")
      .insert({
        seller_name: sellerName,
        seller_phone: sellerPhone || "",
        seller_email: sellerEmail || null,
        email: sellerEmail || null,
        phone: sellerPhone || null,
        town: pickupTown,
        postcode: pickupPostcode,
        address_line_1: pickupAddress || "Address to confirm",
        address_line: pickupAddress || null,
        notes: pickupNotes || null,
      })
      .select("id")
      .single();

    if (pickupError || !pickup) {
      return NextResponse.json(
        { error: pickupError?.message || "Could not create pickup details" },
        { status: 400 }
      );
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("delivery_addresses")
      .insert({
        recipient_name: buyerName,
        recipient_phone: buyerPhone || "",
        town: deliveryTown,
        postcode: deliveryPostcode,
        address_line_1: deliveryAddress || "Address to confirm",
        address_line: deliveryAddress || null,
        notes: deliveryNotes || null,
      })
      .select("id")
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: deliveryError?.message || "Could not create delivery details" },
        { status: 400 }
      );
    }

    const quoteCalc = calculateQuote({
      routeDistanceMiles: route.distanceMiles,
      routeDurationMinutes: route.durationMinutes,
      itemSize,
      approximateWeightKg,
      quantity: 1,
      urgency,
      requiresVan,
      fragile,
      pickupStairsFloors,
      deliveryStairsFloors,
      requiresTwoPeople,
      sameTown: pickupTown.toLowerCase() === deliveryTown.toLowerCase(),
    });

    const driverPayout = calculateDriverPayoutAmount(quoteCalc.subtotal);

    // Optional buyer user link when a UUID is supplied
    const buyerId =
      typeof body.buyerId === "string" &&
      /^[0-9a-f-]{36}$/i.test(body.buyerId)
        ? body.buyerId
        : null;

    const { data: quoteRow, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        buyer_id: buyerId,
        pickup_postcode: pickupPostcode,
        delivery_postcode: deliveryPostcode,
        route_distance_miles: route.distanceMiles,
        route_duration_minutes: route.durationMinutes,
        item_summary: `${itemTitle} (${itemSize})`,
        quote_breakdown: quoteCalc,
        subtotal: quoteCalc.subtotal,
        platform_fee: quoteCalc.platformServiceFee,
        total_price: quoteCalc.totalBuyerPrice,
        driver_payout_estimate: driverPayout,
        expires_at: new Date(
          Date.now() + quoteCalc.quoteExpiryMinutes * 60_000
        ).toISOString(),
        status: "quote_created",
      })
      .select("id")
      .single();

    if (quoteError || !quoteRow) {
      return NextResponse.json(
        { error: quoteError?.message || "Could not create quote" },
        { status: 400 }
      );
    }

    // Buyer access token for quote/checkout/track (never grant access by booking UUID alone)
    const accessToken = generateAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        quote_id: quoteRow.id,
        buyer_id: buyerId,
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
        accepted_price: quoteCalc.totalBuyerPrice,
        delivery_quote_amount: quoteCalc.totalBuyerPrice,
        driver_payout_amount: driverPayout,
        platform_fee_amount: quoteCalc.platformServiceFee,
        seller_flow_type: "buyer_led",
        private_buyer_token_hash: accessTokenHash,
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
      return NextResponse.json(
        { error: bookingError?.message || "Could not create booking" },
        { status: 400 }
      );
    }

    await supabase.from("status_events").insert({
      booking_id: booking.id,
      new_status: "seller_quote_pending",
      actor_role: "buyer",
      actor_user_id: buyerId,
      note: "Buyer-led quote created",
      metadata: {
        quote_id: quoteRow.id,
        buyer_email: buyerEmail || null,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      quoteId: quoteRow.id,
      quoteAmount: quoteCalc.totalBuyerPrice,
      driverPayoutEstimate: driverPayout,
      route,
      /** Opaque buyer access token — required on subsequent booking APIs */
      accessToken,
      redirectTo: `/quote/${booking.id}?token=${encodeURIComponent(accessToken)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create buyer quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
