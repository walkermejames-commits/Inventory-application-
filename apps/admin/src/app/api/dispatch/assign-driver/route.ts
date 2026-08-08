import { NextResponse } from "next/server";
import { canDispatch } from "@door-in-four/shared";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = gateAdminApi(request);
    if (isNextResponse(auth)) return auth;

    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const driverId = typeof body.driverId === "string" ? body.driverId : "";
    const actorUserId = auth.actorUserId || body.actorUserId || null;

    if (!bookingId || !driverId) {
      return NextResponse.json(
        { error: "bookingId and driverId are required" },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id,status,payment_status,driver_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: bookingError?.message || "Booking not found" },
        { status: 404 }
      );
    }

    if (!canDispatch(booking.payment_status, booking.status)) {
      return NextResponse.json(
        { error: "Only paid jobs waiting for dispatch can be assigned" },
        { status: 400 }
      );
    }

    if (booking.driver_id) {
      return NextResponse.json({ error: "Booking already has a driver" }, { status: 400 });
    }

    const { data: driver, error: driverError } = await supabase
      .from("driver_profiles")
      .select("id,status,current_availability,user_id")
      .eq("id", driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: driverError?.message || "Driver not found" },
        { status: 404 }
      );
    }

    if (driver.current_availability === false) {
      return NextResponse.json({ error: "Driver is marked unavailable" }, { status: 400 });
    }

    // Prefer users.id on bookings.driver_id (FK to users); fall back to profile id if needed
    const assignedDriverUserId = driver.user_id || driverId;

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        driver_id: assignedDriverUserId,
        status: "driver_assigned",
      })
      .eq("id", bookingId)
      .select("id,status,payment_status,driver_id")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || "Could not assign driver" },
        { status: 400 }
      );
    }

    await supabase.from("status_events").insert({
      booking_id: bookingId,
      previous_status: booking.status,
      new_status: "driver_assigned",
      actor_user_id: actorUserId,
      actor_role: "admin",
      note: `FC assigned driver ${assignedDriverUserId}`,
    });

    await supabase.from("audit_events").insert({
      actor_user_id: actorUserId,
      actor_role: "admin",
      action: "driver_assigned",
      entity_type: "booking",
      entity_id: bookingId,
      metadata: {
        driver_id: assignedDriverUserId,
        driver_profile_id: driverId,
        authMode: auth.mode,
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign driver";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
