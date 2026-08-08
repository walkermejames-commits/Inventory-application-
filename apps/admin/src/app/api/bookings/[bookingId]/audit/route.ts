import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { bookingId } = await context.params;
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("entity_type", "booking")
    .eq("entity_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ auditEvents: data });
}
