import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function GET(_: Request, { params }: { params: { bookingId: string } }) {
  const { data, error } = await supabase.from("audit_events").select("*").eq("entity_type", "booking").eq("entity_id", params.bookingId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ auditEvents: data });
}
