import { calculateQuote } from "@door-in-four/pricing";
import { quoteRequestSchema } from "@door-in-four/shared";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function POST(request: Request) {
  const parsed = quoteRequestSchema.parse(await request.json());
  const quote = calculateQuote({
    routeDistanceMiles: parsed.routeDistanceMiles,
    routeDurationMinutes: parsed.routeDurationMinutes,
    itemSize: parsed.itemSize,
    approximateWeightKg: parsed.approximateWeightKg,
    quantity: parsed.quantity,
    urgency: parsed.urgency,
    requiresVan: parsed.requiresVan,
    fragile: parsed.fragile,
    pickupStairsFloors: parsed.pickupStairsFloors,
    deliveryStairsFloors: parsed.deliveryStairsFloors,
    requiresTwoPeople: parsed.requiresTwoPeople,
    sameTown: parsed.pickupTown === parsed.deliveryTown
  });

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      buyer_id: parsed.buyerId,
      pickup_postcode: parsed.pickupPostcode,
      delivery_postcode: parsed.deliveryPostcode,
      route_distance_miles: parsed.routeDistanceMiles,
      route_duration_minutes: parsed.routeDurationMinutes,
      item_summary: `${parsed.itemSize} x${parsed.quantity}`,
      quote_breakdown: quote,
      subtotal: quote.subtotal,
      platform_fee: quote.platformServiceFee,
      total_price: quote.totalBuyerPrice,
      driver_payout_estimate: quote.driverPayoutEstimate,
      expires_at: new Date(Date.now() + quote.quoteExpiryMinutes * 60_000).toISOString(),
      status: "quote_created"
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ quote: data });
}
