import { NextResponse } from "next/server";
import { isDriverStatusTransitionAllowed } from "@door-in-four/shared";
import type { BookingStatus } from "@door-in-four/types";
import { supabase } from "@/lib/server";
import { verifyCode } from "@/lib/security";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const body = await request.json();
  const driverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
  const toStatus = body.toStatus as BookingStatus;
  const sellerCode = body.sellerCode;
  const buyerCode = body.buyerCode;
  const photoPath = body.photoPath;

  if (!driverId) {
    return NextResponse.json({ error: "driverId is required" }, { status: 400 });
  }

  if (!toStatus) {
    return NextResponse.json({ error: "toStatus is required" }, { status: 400 });
  }

  const auth = gateMobileApi(request, { expectedDriverId: driverId });
  if (isNextResponse(auth)) return auth;

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.driver_id !== driverId) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  // Strict driver chain only — no skip to completed / delivery without verifications
  if (
    !isDriverStatusTransitionAllowed(
      booking.status as BookingStatus,
      toStatus as BookingStatus
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid driver transition",
        detail: "Drivers may only advance one status step at a time; verification stages cannot be skipped",
        from: booking.status,
        to: toStatus,
      },
      { status: 400 }
    );
  }

  if (toStatus === "pickup_verified") {
    if (!verifyCode(sellerCode || "", booking.seller_handover_code_hash) || !photoPath) {
      return NextResponse.json(
        { error: "Seller handover code and pickup proof photo are required" },
        { status: 400 }
      );
    }

    await supabase.from("photos").insert({
      booking_id: booking.id,
      uploaded_by_user_id: driverId,
      photo_type: "pickup_proof",
      storage_path: photoPath,
    });
  }

  if (toStatus === "delivery_verified") {
    if (!verifyCode(buyerCode || "", booking.buyer_delivery_code_hash) || !photoPath) {
      return NextResponse.json(
        { error: "Buyer delivery code and delivery proof photo are required" },
        { status: 400 }
      );
    }

    await supabase.from("photos").insert({
      booking_id: booking.id,
      uploaded_by_user_id: driverId,
      photo_type: "delivery_proof",
      storage_path: photoPath,
    });
  }

  await supabase.from("bookings").update({ status: toStatus }).eq("id", booking.id);

  await supabase.from("status_events").insert({
    booking_id: booking.id,
    previous_status: booking.status,
    new_status: toStatus,
    actor_user_id: driverId,
    actor_role: "driver",
    note: "Driver progress update",
  });

  // Payout ready only after a legal step into completed (must have walked verification chain)
  let paymentStatus = booking.payment_status;
  if (toStatus === "completed") {
    const { data: payout } = await supabase
      .from("payouts")
      .select("id")
      .eq("booking_id", booking.id)
      .single();

    if (payout) {
      await supabase.from("payouts").update({ status: "payout_ready" }).eq("id", payout.id);
    } else {
      await supabase.from("payouts").insert({
        booking_id: booking.id,
        driver_id: booking.driver_id,
        stripe_connect_account_id: null,
        amount: booking.driver_payout_amount,
        currency: "gbp",
        status: "payout_ready",
      });
    }

    await supabase
      .from("bookings")
      .update({ payment_status: "payout_ready" })
      .eq("id", booking.id);

    paymentStatus = "payout_ready";
  }

  const { data: refreshed } = await supabase
    .from("bookings")
    .select(
      `
      id,status,payment_status,driver_id,item_title,item_size,approximate_weight_kg,fragile,requires_two_people,requires_van,delivery_quote_amount,accepted_price,driver_payout_amount,created_at,updated_at,
      pickup_contacts (town, postcode, address_line_1),
      delivery_addresses (town, postcode, address_line_1)
    `
    )
    .eq("id", booking.id)
    .single();

  const pickup = Array.isArray(refreshed?.pickup_contacts)
    ? refreshed?.pickup_contacts[0]
    : refreshed?.pickup_contacts;
  const delivery = Array.isArray(refreshed?.delivery_addresses)
    ? refreshed?.delivery_addresses[0]
    : refreshed?.delivery_addresses;

  return NextResponse.json({
    success: true,
    booking: refreshed
      ? {
          id: refreshed.id,
          status: refreshed.status,
          payment_status: refreshed.payment_status || paymentStatus,
          driver_id: refreshed.driver_id,
          pickup_town: pickup?.town || "Pickup",
          pickup_postcode: pickup?.postcode || null,
          pickup_address_line: pickup?.address_line_1 || null,
          delivery_town: delivery?.town || "Delivery",
          delivery_postcode: delivery?.postcode || null,
          delivery_address_line: delivery?.address_line_1 || null,
          item_title: refreshed.item_title || "Delivery job",
          item_size: refreshed.item_size || "medium",
          approximate_weight_kg: Number(refreshed.approximate_weight_kg || 0),
          fragile: Boolean(refreshed.fragile),
          requires_two_people: Boolean(refreshed.requires_two_people),
          requires_van: Boolean(refreshed.requires_van),
          delivery_quote_amount: refreshed.delivery_quote_amount,
          accepted_price: refreshed.accepted_price,
          driver_payout_amount: refreshed.driver_payout_amount,
          created_at: refreshed.created_at,
          updated_at: refreshed.updated_at ?? null,
        }
      : {
          id: booking.id,
          status: toStatus,
          payment_status: paymentStatus,
          driver_id: booking.driver_id,
        },
  });
}
