import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { verifyCode } from "@/lib/security";
import { isStatusTransitionAllowed } from "@door-in-four/shared";

export async function POST(request: Request, { params }: { params: { bookingId: string } }) {
  const { driverId, toStatus, sellerCode, buyerCode, photoPath } = await request.json();
  const { data: booking } = await supabase.from("bookings").select("*").eq("id", params.bookingId).single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.driver_id !== driverId) return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  if (!isStatusTransitionAllowed(booking.status, toStatus)) return NextResponse.json({ error: "Invalid transition" }, { status: 400 });

  if (toStatus === "pickup_verified") {
    if (!verifyCode(sellerCode || "", booking.seller_handover_code_hash) || !photoPath) {
      return NextResponse.json({ error: "Seller handover code and pickup proof photo are required" }, { status: 400 });
    }
    await supabase.from("photos").insert({ booking_id: booking.id, uploaded_by_user_id: driverId, photo_type: "pickup_proof", storage_path: photoPath });
  }

  if (toStatus === "delivery_verified" || toStatus === "delivered") {
    if (!verifyCode(buyerCode || "", booking.buyer_delivery_code_hash) || !photoPath) {
      return NextResponse.json({ error: "Buyer delivery code and delivery proof photo are required" }, { status: 400 });
    }
    await supabase.from("photos").insert({ booking_id: booking.id, uploaded_by_user_id: driverId, photo_type: "delivery_proof", storage_path: photoPath });
  }

  await supabase.from("bookings").update({ status: toStatus }).eq("id", booking.id);
  await supabase.from("status_events").insert({
    booking_id: booking.id,
    previous_status: booking.status,
    new_status: toStatus,
    actor_user_id: driverId,
    actor_role: "driver",
    note: "Driver progress update"
  });

  if (toStatus === "completed") {
    const { data: payout } = await supabase.from("payouts").select("id").eq("booking_id", booking.id).single();
    if (payout) {
      await supabase.from("payouts").update({ status: "payout_ready" }).eq("id", payout.id);
    } else {
      await supabase.from("payouts").insert({
        booking_id: booking.id,
        driver_id: booking.driver_id,
        stripe_connect_account_id: null,
        amount: booking.driver_payout_amount,
        currency: "gbp",
        status: "payout_ready"
      });
    }
  }

  return NextResponse.json({ success: true });
}
