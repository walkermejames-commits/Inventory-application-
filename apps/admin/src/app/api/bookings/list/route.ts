import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  let query = supabase
    .from("bookings")
    .select(
      "id,status,payment_status,accepted_price,created_at,buyer_id,driver_id,item_title"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bookings: data });
}
