import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function GET(_: Request, { params }: { params: { bookingId: string } }) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, quotes(*), pickup_contacts(*), delivery_addresses(*), payments(*), photos(*), status_events(*), disputes(*), admin_notes(*), users!bookings_driver_id_fkey(*)")
    .eq("id", params.bookingId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ booking: data });
}
