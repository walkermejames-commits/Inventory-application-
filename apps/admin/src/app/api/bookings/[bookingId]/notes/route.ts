import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function POST(request: Request, { params }: { params: { bookingId: string } }) {
  const { adminUserId, note } = await request.json();
  const { error } = await supabase.from("admin_notes").insert({ booking_id: params.bookingId, admin_user_id: adminUserId, note });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
