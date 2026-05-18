import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "../../../lib/server";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  const { token } = await request.json();
  const { data: contact } = await supabase.from("pickup_contacts").select("id").eq("secure_token_hash", hashToken(token)).single();
  if (!contact) return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  const { error } = await supabase.from("pickup_contacts").update({ collection_confirmed: true }).eq("id", contact.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}