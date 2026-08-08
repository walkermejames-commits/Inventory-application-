import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId")?.trim();

  if (!driverId) {
    return NextResponse.json({ error: "driverId is required" }, { status: 400 });
  }

  const auth = gateMobileApi(request, { expectedDriverId: driverId });
  if (isNextResponse(auth)) return auth;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,status,driver_id,accepted_price,created_at,pickup_contact:pickup_contacts(town,postcode),delivery_address:delivery_addresses(town,postcode)"
    )
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ jobs: data || [] });
}
