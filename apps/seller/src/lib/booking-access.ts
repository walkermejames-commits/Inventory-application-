import crypto from "node:crypto";

export type BookingAccessRole = "buyer" | "seller";

export type BookingAccessAction =
  | "read"
  | "quote_confirm"
  | "checkout"
  | "seller_flags";

export function hashAccessToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function extractAccessToken(input: {
  queryToken?: string | null;
  headerToken?: string | null;
  bearerToken?: string | null;
  bodyToken?: string | null;
}): string | null {
  const candidates = [
    input.queryToken,
    input.headerToken,
    input.bearerToken,
    input.bodyToken,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function extractAccessTokenFromRequest(
  request: Request,
  body?: Record<string, unknown> | null
): string | null {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;

  return extractAccessToken({
    queryToken: url.searchParams.get("token"),
    headerToken: request.headers.get("x-booking-access-token"),
    bearerToken: bearer,
    bodyToken: typeof body?.token === "string" ? body.token : null,
  });
}

/**
 * Pure access resolution for tests and route handlers.
 * Booking UUID alone never grants access — a valid hashed token is required.
 */
export function resolveBookingAccess(params: {
  providedToken: string | null | undefined;
  buyerTokenHash: string | null | undefined;
  sellerTokenHash: string | null | undefined;
}):
  | { ok: true; role: BookingAccessRole; tokenHash: string }
  | { ok: false; status: number; error: string } {
  if (!params.providedToken || !params.providedToken.trim()) {
    return {
      ok: false,
      status: 401,
      error: "Access token is required",
    };
  }

  const tokenHash = hashAccessToken(params.providedToken.trim());

  if (
    params.buyerTokenHash &&
    params.buyerTokenHash === tokenHash
  ) {
    return { ok: true, role: "buyer", tokenHash };
  }

  if (
    params.sellerTokenHash &&
    params.sellerTokenHash === tokenHash
  ) {
    return { ok: true, role: "seller", tokenHash };
  }

  return {
    ok: false,
    status: 403,
    error: "Invalid or unauthorized access token",
  };
}

export function canPerformBookingAction(
  role: BookingAccessRole,
  action: BookingAccessAction
): boolean {
  switch (action) {
    case "read":
      return role === "buyer" || role === "seller";
    case "quote_confirm":
    case "checkout":
      return role === "buyer";
    case "seller_flags":
      return role === "seller";
    default:
      return false;
  }
}

/** Generate a random opaque access token (plaintext — store only the hash). */
export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
