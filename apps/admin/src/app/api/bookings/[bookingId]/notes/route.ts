import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/server";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const { adminUserId, note } = await request.json();
  const { error } = await supabase
    .from("admin_notes")
    .insert({ booking_id: bookingId, admin_user_id: adminUserId, note });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

