import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { bookingId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!note) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  // Actor from trusted auth only — never unauthenticated body adminUserId
  const adminUserId = auth.actorUserId || null;

  const { error } = await supabase.from("admin_notes").insert({
    booking_id: bookingId,
    admin_user_id: adminUserId,
    note,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: auditError } = await supabase.from("audit_events").insert({
    actor_user_id: adminUserId,
    actor_role: "admin",
    action: "admin_note_added",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: { note_preview: note.slice(0, 120), authMode: auth.mode },
  });

  if (auditError) {
    return NextResponse.json(
      { error: `Note saved but audit failed: ${auditError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
