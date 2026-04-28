import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  let query = supabase.from("bookings").select("id,status,payment_status,accepted_price,created_at,buyer_id,driver_id").order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bookings: data });
}
