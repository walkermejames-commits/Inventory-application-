import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/api-security";
import { supabase } from "@/lib/server";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminRequest(request);
    if (auth.ok === false) return auth.response;

    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const driverId = typeof body.driverId === "string" ? body.driverId : "";

    if (!bookingId || !driverId) {
      return NextResponse.json({ error: "bookingId and driverId are required" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id,status,driver_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: bookingError?.message || "Booking not found" }, { status: 404 });
    }

    const { data: driver, error: driverError } = await supabase
      .from("driver_profiles")
      .select("id,status,current_availability")
      .eq("id", driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json({ error: driverError?.message || "Driver not found" }, { status: 404 });
    }

    if (driver.status && !["approved", "active", "pending"].includes(driver.status)) {
      return NextResponse.json({ error: "Driver is not eligible for assignment" }, { status: 400 });
    }

    const previousStatus = booking.status || "unknown";

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({
        driver_id: driverId,
        status: "driver_assigned",
      })
      .eq("id", bookingId)
      .select("id,status,driver_id")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Could not assign driver" }, { status: 400 });
    }

    await supabase.from("status_events").insert({
      booking_id: bookingId,
      previous_status: previousStatus,
      new_status: "driver_assigned",
      actor_role: "fc",
      note: `FC assigned driver ${driverId}`,
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign driver";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
