import { NextResponse } from "next/server";
import {
  isDriverStatusTransitionAllowed,
  isLocalDevicePhotoPath,
  planPayoutReadySteps,
  verifyRegisteredProofPhoto,
  type ProofPhotoRecord,
} from "@door-in-four/shared";
import type { BookingStatus } from "@door-in-four/types";
import { supabase } from "@/lib/server";
import { verifyCode } from "@/lib/security";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

async function requireRegisteredProof(params: {
  bookingId: string;
  driverId: string;
  photoType: "pickup_proof" | "delivery_proof";
  storagePath: string;
}) {
  if (isLocalDevicePhotoPath(params.storagePath)) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid proof photo path",
      detail:
        "Upload the photo via /api/mobile/proof-upload first and send the returned storagePath",
    };
  }

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id,booking_id,uploaded_by_user_id,photo_type,storage_path")
    .eq("booking_id", params.bookingId)
    .eq("uploaded_by_user_id", params.driverId)
    .eq("photo_type", params.photoType)
    .eq("storage_path", params.storagePath);

  if (error) {
    return {
      ok: false as const,
      status: 500,
      error: `Could not verify proof photo: ${error.message}`,
    };
  }

  const verification = verifyRegisteredProofPhoto({
    photos: (photos || []) as ProofPhotoRecord[],
    bookingId: params.bookingId,
    driverId: params.driverId,
    photoType: params.photoType,
    storagePath: params.storagePath,
  });

  if (verification.ok === false) {
    return {
      ok: false as const,
      status: verification.status,
      error: verification.error,
    };
  }

  return { ok: true as const, photo: verification.photo };
}

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

  const { data: booking, error: bookingLookupError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingLookupError || !booking) {
    return NextResponse.json(
      { error: bookingLookupError?.message || "Booking not found" },
      { status: 404 }
    );
  }
  if (booking.driver_id !== driverId) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  if (
    !isDriverStatusTransitionAllowed(
      booking.status as BookingStatus,
      toStatus as BookingStatus
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid driver transition",
        detail:
          "Drivers may only advance one status step at a time; verification stages cannot be skipped",
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

    const proof = await requireRegisteredProof({
      bookingId: booking.id,
      driverId,
      photoType: "pickup_proof",
      storagePath: photoPath,
    });
    if (!proof.ok) {
      return NextResponse.json(
        { error: proof.error, detail: "detail" in proof ? proof.detail : undefined },
        { status: proof.status }
      );
    }
    // Canonical metadata already created by proof-upload — do not insert a duplicate
  }

  if (toStatus === "delivery_verified") {
    if (!verifyCode(buyerCode || "", booking.buyer_delivery_code_hash) || !photoPath) {
      return NextResponse.json(
        { error: "Buyer delivery code and delivery proof photo are required" },
        { status: 400 }
      );
    }

    const proof = await requireRegisteredProof({
      bookingId: booking.id,
      driverId,
      photoType: "delivery_proof",
      storagePath: photoPath,
    });
    if (!proof.ok) {
      return NextResponse.json(
        { error: proof.error, detail: "detail" in proof ? proof.detail : undefined },
        { status: proof.status }
      );
    }
  }

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", booking.id);

  if (bookingUpdateError) {
    return NextResponse.json(
      { error: `Could not update booking status: ${bookingUpdateError.message}` },
      { status: 500 }
    );
  }

  const { error: eventError } = await supabase.from("status_events").insert({
    booking_id: booking.id,
    previous_status: booking.status,
    new_status: toStatus,
    actor_user_id: driverId,
    actor_role: "driver",
    note: "Driver progress update",
  });

  if (eventError) {
    return NextResponse.json(
      {
        error: `Status updated but status_events insert failed: ${eventError.message}`,
        partial: true,
        bookingStatus: toStatus,
      },
      { status: 500 }
    );
  }

  let paymentStatus = booking.payment_status;

  if (toStatus === "completed") {
    const { data: existingPayout, error: payoutLookupError } = await supabase
      .from("payouts")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    // PGRST116 is "no rows" for .single(); with maybeSingle, real errors still matter
    if (payoutLookupError) {
      return NextResponse.json(
        {
          error: `Booking completed but payout lookup failed: ${payoutLookupError.message}`,
          partial: true,
          bookingStatus: "completed",
        },
        { status: 500 }
      );
    }

    const steps = planPayoutReadySteps({
      bookingId: booking.id,
      driverId: booking.driver_id,
      driverPayoutAmount: booking.driver_payout_amount,
      existingPayoutId: existingPayout?.id ?? null,
    });

    for (const step of steps) {
      if (step.type === "update") {
        const { error: payoutUpdateError } = await supabase
          .from("payouts")
          .update({ status: step.status })
          .eq("id", step.payoutId);

        if (payoutUpdateError) {
          return NextResponse.json(
            {
              error: `Booking completed but payout update failed: ${payoutUpdateError.message}`,
              partial: true,
              bookingStatus: "completed",
              paymentStatus,
            },
            { status: 500 }
          );
        }
      }

      if (step.type === "insert") {
        const { error: payoutInsertError } = await supabase.from("payouts").insert({
          booking_id: step.bookingId,
          driver_id: step.driverId,
          stripe_connect_account_id: null,
          amount: step.amount,
          currency: "gbp",
          status: step.status,
        });

        if (payoutInsertError) {
          return NextResponse.json(
            {
              error: `Booking completed but payout insert failed: ${payoutInsertError.message}`,
              partial: true,
              bookingStatus: "completed",
              paymentStatus,
            },
            { status: 500 }
          );
        }
      }

      if (step.type === "set_booking_payment_status") {
        const { error: paymentStatusError } = await supabase
          .from("bookings")
          .update({ payment_status: step.status })
          .eq("id", booking.id);

        if (paymentStatusError) {
          return NextResponse.json(
            {
              error: `Booking completed but payment_status update failed: ${paymentStatusError.message}`,
              partial: true,
              bookingStatus: "completed",
              paymentStatus,
            },
            { status: 500 }
          );
        }

        paymentStatus = step.status;
      }
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
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

  if (refreshError) {
    // Status already committed — report partial success rather than silent full success
    return NextResponse.json(
      {
        success: true,
        partial: true,
        warning: `Status updated but booking refresh failed: ${refreshError.message}`,
        booking: {
          id: booking.id,
          status: toStatus,
          payment_status: paymentStatus,
          driver_id: booking.driver_id,
        },
      },
      { status: 200 }
    );
  }

  const pickup = Array.isArray(refreshed?.pickup_contacts)
    ? refreshed?.pickup_contacts[0]
    : refreshed?.pickup_contacts;
  const delivery = Array.isArray(refreshed?.delivery_addresses)
    ? refreshed?.delivery_addresses[0]
    : refreshed?.delivery_addresses;

  return NextResponse.json({
    success: true,
    booking: {
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
    },
  });
}
