import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  const { token, bookingId, description } = await request.json();
  const { data: contact } = await supabase.from("pickup_contacts").select("id").eq("secure_token_hash", hashToken(token)).single();
  if (!contact) return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  await supabase.from("disputes").insert({ booking_id: bookingId, description, dispute_type: "seller_issue" });
  return NextResponse.json({ success: true });
}