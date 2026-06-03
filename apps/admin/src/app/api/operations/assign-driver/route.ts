import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/api-security";
import { assignDriverToBooking } from "@/lib/driver-assignment";

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

    const result = await assignDriverToBooking(bookingId, driverId, "operations");

    return NextResponse.json({ success: true, booking: result.booking, dueAt: result.dueAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not assign driver";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
