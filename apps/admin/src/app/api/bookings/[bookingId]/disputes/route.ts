import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/api-security";
import { supabase } from "@/lib/server";


type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminRequest(request);
  if (auth.ok === false) return auth.response;

  const { bookingId } = await context.params;
  const { openedByUserId, disputeType, description } = await request.json();
  const { error } = await supabase
    .from("disputes")
    .insert({ booking_id: bookingId, opened_by_user_id: openedByUserId, dispute_type: disputeType, description });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
