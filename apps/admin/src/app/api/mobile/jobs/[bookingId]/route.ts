import { NextResponse } from "next/server";
import { requireDriverRequest } from "@/lib/api-security";
import { mobileBookingSelect, toMobileBooking } from "@/lib/mobile-booking";
import { supabase } from "@/lib/server";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params;
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const auth = await requireDriverRequest(request, driverId);
    if (auth.ok === false) return auth.response;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`driver_id,${mobileBookingSelect}`)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: error?.message || "Booking not found" }, { status: 404 });
    }

    if (booking.driver_id !== driverId) {
      return NextResponse.json({ error: "This job is not assigned to this driver" }, { status: 403 });
    }

    return NextResponse.json({ booking: toMobileBooking(booking) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
