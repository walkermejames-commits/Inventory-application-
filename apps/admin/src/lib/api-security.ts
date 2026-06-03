import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

type AuthResult = {
  ok: true;
  userId?: string;
  role?: string;
} | {
  ok: false;
  response: NextResponse;
};

function constantTimeEqual(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

function bearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

function hasSharedSecret(request: Request, envName: string, headerName: string) {
  const expected = process.env[envName] || "";
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const supplied = request.headers.get(headerName) || bearerToken(request);
  return supplied ? constantTimeEqual(supplied, expected) : false;
}

function hasDemoDriverSecret(request: Request, driverId: string) {
  const expected = process.env.DEMO_DRIVER_API_SECRET || "";
  const demoDriverId = process.env.DEMO_DRIVER_ID || "";

  if (!expected || !demoDriverId || driverId !== demoDriverId) {
    return false;
  }

  const supplied = request.headers.get("x-demo-driver-secret") || "";
  return supplied ? constantTimeEqual(supplied, expected) : false;
}

export async function requireAdminRequest(request: Request): Promise<AuthResult> {
  if (hasSharedSecret(request, "ADMIN_API_SECRET", "x-admin-api-secret")) {
    return { ok: true, role: "admin" };
  }

  const token = bearerToken(request);
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "Invalid authentication token" }, { status: 401 }) };
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id,role")
    .eq("id", data.user.id)
    .single();

  if (userError || userRow?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { ok: true, userId: data.user.id, role: "admin" };
}

export async function requireDriverRequest(request: Request, driverId: string): Promise<AuthResult> {
  // Mobile driver routes receive driver_profiles.id as driverId. A Supabase
  // bearer token is valid only when auth.users.id owns that driver profile via
  // driver_profiles.user_id. During the pilot, DEMO_DRIVER_ID is also a
  // driver_profiles.id and is accepted only with DEMO_DRIVER_API_SECRET.
  if (hasDemoDriverSecret(request, driverId)) {
    return { ok: true, userId: driverId, role: "driver" };
  }

  const token = bearerToken(request);
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Driver authentication required" }, { status: 401 }) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "Invalid authentication token" }, { status: 401 }) };
  }

  if (data.user.id !== driverId) {
    const { data: driverProfile, error: driverProfileError } = await supabase
      .from("driver_profiles")
      .select("id,user_id")
      .eq("id", driverId)
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (driverProfileError || !driverProfile) {
      return { ok: false, response: NextResponse.json({ error: "Driver token does not match driverId" }, { status: 403 }) };
    }
  }

  return { ok: true, userId: data.user.id, role: "driver" };
}

export function requireReflexSecret(request: Request): AuthResult {
  const expected = process.env.DISPATCH_REFLEX_SECRET || "";
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "DISPATCH_REFLEX_SECRET must be configured before dispatch reflex can run" },
        { status: 503 }
      )
    };
  }

  const supplied = request.headers.get("x-dispatch-reflex-secret") || bearerToken(request);
  if (!supplied || !constantTimeEqual(supplied, expected)) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) };
  }

  return { ok: true, role: "system" };
}
