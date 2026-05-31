import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

type AuthResult = { ok: true } | { ok: false; response: NextResponse };

function constantTimeEqual(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

function bearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
}

export function requireSellerApiSecret(request: Request): AuthResult {
  const expected = process.env.SELLER_API_SECRET || "";
  if (!expected) {
    return process.env.NODE_ENV === "production"
      ? {
          ok: false,
          response: NextResponse.json(
            { error: "SELLER_API_SECRET must be configured for server-side seller actions" },
            { status: 503 }
          )
        }
      : { ok: true };
  }

  const supplied = request.headers.get("x-seller-api-secret") || bearerToken(request);
  if (!supplied || !constantTimeEqual(supplied, expected)) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) };
  }

  return { ok: true };
}
