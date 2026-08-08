export type ApiAuthMode = "api_key" | "mobile_key" | "dev_open";

export type ApiAuthSuccess = {
  ok: true;
  mode: ApiAuthMode;
  /** Actor id comes only from a trusted header after auth succeeds — never from unauthenticated body alone. */
  actorUserId: string | null;
  actorRole: "admin" | "driver" | "service";
};

export type ApiAuthFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

function extractApiKey(request: Request): string | null {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey?.trim()) return headerKey.trim();

  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function trustedActorUserId(request: Request): string | null {
  const fromHeader = request.headers.get("x-actor-user-id")?.trim();
  if (fromHeader) return fromHeader;
  return null;
}

/**
 * Protect admin / ops / payment mutation APIs.
 * Requires ADMIN_API_SECRET via `x-api-key` or `Authorization: Bearer …`.
 * In non-production, if the secret is unset, allows with a warning (dev only).
 */
export function requireAdminApiAuth(request: Request): ApiAuthResult {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  const provided = extractApiKey(request);
  const nodeEnv = process.env.NODE_ENV || "development";

  if (secret) {
    if (!provided || provided !== secret) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }
    return {
      ok: true,
      mode: "api_key",
      actorUserId: trustedActorUserId(request),
      actorRole: "admin",
    };
  }

  if (nodeEnv === "production") {
    return {
      ok: false,
      status: 500,
      error: "Server misconfigured: ADMIN_API_SECRET is required in production",
    };
  }

  console.warn(
    "[door-in-four/auth] ADMIN_API_SECRET is unset; allowing admin API access in non-production only"
  );
  return {
    ok: true,
    mode: "dev_open",
    actorUserId: trustedActorUserId(request),
    actorRole: "admin",
  };
}

/**
 * Protect driver / mobile APIs.
 * Accepts MOBILE_API_SECRET or ADMIN_API_SECRET.
 * Optionally enforces that the caller’s x-driver-id matches the resource driverId.
 */
export function requireMobileApiAuth(
  request: Request,
  options?: { expectedDriverId?: string | null }
): ApiAuthResult {
  const mobileSecret = process.env.MOBILE_API_SECRET?.trim();
  const adminSecret = process.env.ADMIN_API_SECRET?.trim();
  const provided = extractApiKey(request);
  const nodeEnv = process.env.NODE_ENV || "development";

  const accepted =
    (Boolean(mobileSecret) && provided === mobileSecret) ||
    (Boolean(adminSecret) && provided === adminSecret);

  if (mobileSecret || adminSecret) {
    if (!accepted) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const headerDriverId = request.headers.get("x-driver-id")?.trim() || null;
    if (
      options?.expectedDriverId &&
      headerDriverId &&
      headerDriverId !== options.expectedDriverId
    ) {
      return { ok: false, status: 403, error: "Driver identity mismatch" };
    }

    return {
      ok: true,
      mode: mobileSecret && provided === mobileSecret ? "mobile_key" : "api_key",
      actorUserId: headerDriverId || trustedActorUserId(request),
      actorRole: "driver",
    };
  }

  if (nodeEnv === "production") {
    return {
      ok: false,
      status: 500,
      error:
        "Server misconfigured: MOBILE_API_SECRET or ADMIN_API_SECRET is required in production",
    };
  }

  console.warn(
    "[door-in-four/auth] mobile/admin API secrets unset; allowing mobile API access in non-production only"
  );
  return {
    ok: true,
    mode: "dev_open",
    actorUserId:
      request.headers.get("x-driver-id")?.trim() || trustedActorUserId(request),
    actorRole: "driver",
  };
}
