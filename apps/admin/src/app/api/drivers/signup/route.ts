import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";
import { gateMobileApi, isNextResponse } from "@/lib/auth";

/** Driver self-signup — requires mobile API key (pilot credential). */
export async function POST(request: Request) {
  const auth = gateMobileApi(request);
  if (isNextResponse(auth)) return auth;

  const payload = await request.json();
  const fullName = String(payload.fullName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim() || null;
  const serviceRadiusMiles = Number(payload.serviceRadiusMiles || 10);

  if (!fullName || !email) {
    return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
  }

  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  let userId = existingUser?.id as string | undefined;

  if (!existingUser) {
    const { data: newUser, error: createUserError } = await supabase
      .from("users")
      .insert({ role: "driver", email, phone, full_name: fullName })
      .select("id")
      .single();

    if (createUserError || !newUser) {
      return NextResponse.json(
        { error: createUserError?.message || "Could not create user" },
        { status: 400 }
      );
    }

    userId = newUser.id;
  }

  if (!userId) return NextResponse.json({ error: "Unable to resolve user" }, { status: 500 });

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("driver_profiles")
    .select("id,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileLookupError) {
    return NextResponse.json({ error: profileLookupError.message }, { status: 400 });
  }

  if (!existingProfile) {
    const { error: profileError } = await supabase.from("driver_profiles").insert({
      user_id: userId,
      status: "pending",
      service_radius_miles: Number.isFinite(serviceRadiusMiles) ? serviceRadiusMiles : 10,
      current_availability: true,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    success: true,
    driverId: userId,
    status: existingProfile?.status || "pending",
  });
}
