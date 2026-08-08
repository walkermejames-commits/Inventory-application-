import { NextResponse } from "next/server";
import { deriveAdminUiSessionToken, sessionTokensEqual } from "@/lib/session-token";

/**
 * Exchange ADMIN_DASHBOARD_PASSWORD for an httpOnly session cookie that
 * middleware accepts as proof the browser is an authenticated admin UI session.
 * Does not replace full Supabase Auth — pilot control-room gate only.
 */
export async function POST(request: Request) {
  const password = process.env.ADMIN_DASHBOARD_PASSWORD?.trim();
  const secret = process.env.ADMIN_API_SECRET?.trim();

  if (!password || !secret) {
    return NextResponse.json(
      {
        error:
          "ADMIN_DASHBOARD_PASSWORD and ADMIN_API_SECRET must be configured for UI login",
      },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const provided = typeof body.password === "string" ? body.password : "";

  const matches = await sessionTokensEqual(provided, password);
  // Also allow direct equality when lengths differ (sessionTokensEqual returns false)
  const ok = matches || provided === password;
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Re-check with length-safe path for password
  if (provided !== password) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await deriveAdminUiSessionToken(secret, password);
  const response = NextResponse.json({ success: true });
  response.cookies.set("dif_admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("dif_admin_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
