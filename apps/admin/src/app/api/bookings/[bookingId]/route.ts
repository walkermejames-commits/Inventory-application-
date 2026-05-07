import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/server";





type RouteContext = { params: Promise<{ bookingId: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const { data, error } = await supabase
    .from("bookings")
    .select("*, quotes(*), pickup_contacts(*), delivery_addresses(*), payments(*), photos(*), status_events(*), disputes(*), admin_notes(*), users!bookings_driver_id_fkey(*)")
    .eq("id", bookingId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ booking: data });
}
