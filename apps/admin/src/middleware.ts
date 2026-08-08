import { NextResponse, type NextRequest } from "next/server";
import {
  deriveAdminUiSessionToken,
  sessionTokensEqual,
} from "@/lib/session-token";

function extractApiKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey?.trim()) return headerKey.trim();
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function hasValidUiSession(request: NextRequest): Promise<boolean> {
  const password = process.env.ADMIN_DASHBOARD_PASSWORD?.trim();
  const secret = process.env.ADMIN_API_SECRET?.trim();
  const cookie = request.cookies.get("dif_admin_session")?.value;
  if (!password || !secret || !cookie) return false;
  const expected = await deriveAdminUiSessionToken(secret, password);
  return sessionTokensEqual(cookie, expected);
}

function isPublicApi(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname === "/api/auth/session") return true;
  return false;
}

function isMobileApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/mobile/") || pathname.startsWith("/api/drivers/")
  );
}

function isPublicPage(pathname: string): boolean {
  if (pathname === "/login") return true;
  // Driver public signup page is informational; mutations still need mobile key
  if (pathname === "/driver-signup") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nodeEnv = process.env.NODE_ENV || "development";
  const adminSecret = process.env.ADMIN_API_SECRET?.trim();
  const mobileSecret = process.env.MOBILE_API_SECRET?.trim();
  const provided = extractApiKey(request);
  const uiSession = await hasValidUiSession(request);

  // ---- Browser pages: require UI session in production when secrets configured ----
  if (!pathname.startsWith("/api/")) {
    if (isPublicPage(pathname)) {
      return NextResponse.next();
    }
    // Protect FC board pages when dashboard password is configured
    if (
      process.env.ADMIN_DASHBOARD_PASSWORD?.trim() &&
      adminSecret &&
      nodeEnv === "production" &&
      !uiSession
    ) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // ---- API ----
  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (uiSession) {
    return NextResponse.next();
  }

  if (isMobileApi(pathname)) {
    const ok =
      (Boolean(mobileSecret) && provided === mobileSecret) ||
      (Boolean(adminSecret) && provided === adminSecret);
    if (ok) return NextResponse.next();
    if (!mobileSecret && !adminSecret && nodeEnv !== "production") {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Organism / internal secret routes still go through admin key or reflex secret in-route
  if (adminSecret && provided === adminSecret) {
    return NextResponse.next();
  }

  if (!adminSecret && nodeEnv !== "production") {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: [
    "/api/:path*",
    "/operations",
    "/operations/:path*",
    "/bookings",
    "/bookings/:path*",
    "/dispatch",
    "/dispatch/:path*",
    "/quotes",
    "/quotes/:path*",
    "/get-a-quote",
    "/get-a-quote/:path*",
    "/performance",
    "/performance/:path*",
    "/",
  ],
};
