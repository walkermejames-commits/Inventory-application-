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
 * When a resource is scoped to a driver, require x-driver-id and match it.
 * A shared MOBILE_API_SECRET alone must not allow acting as an arbitrary driver.
 */
function enforceExpectedDriverIdentity(
  request: Request,
  expectedDriverId: string,
  base: ApiAuthSuccess
): ApiAuthResult {
  const headerDriverId = request.headers.get("x-driver-id")?.trim() || null;

  if (!headerDriverId) {
    return {
      ok: false,
      status: 401,
      error: "Driver identity required (x-driver-id)",
    };
  }

  if (headerDriverId !== expectedDriverId) {
    return {
      ok: false,
      status: 403,
      error: "Driver identity mismatch",
    };
  }

  return {
    ...base,
    actorUserId: headerDriverId,
    actorRole: "driver",
  };
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
 *
 * When `expectedDriverId` is supplied, `x-driver-id` is required and must match.
 * This applies even when the caller authenticated with ADMIN_API_SECRET so a
 * shared secret cannot impersonate an arbitrary driver without declaring identity.
 */
export function requireMobileApiAuth(
  request: Request,
  options?: { expectedDriverId?: string | null }
): ApiAuthResult {
  const mobileSecret = process.env.MOBILE_API_SECRET?.trim();
  const adminSecret = process.env.ADMIN_API_SECRET?.trim();
  const provided = extractApiKey(request);
  const nodeEnv = process.env.NODE_ENV || "development";
  const expectedDriverId = options?.expectedDriverId?.trim() || null;

  const acceptedWithMobile = Boolean(mobileSecret) && provided === mobileSecret;
  const acceptedWithAdmin = Boolean(adminSecret) && provided === adminSecret;
  const accepted = acceptedWithMobile || acceptedWithAdmin;

  if (mobileSecret || adminSecret) {
    if (!accepted) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const base: ApiAuthSuccess = {
      ok: true,
      mode: acceptedWithMobile ? "mobile_key" : "api_key",
      actorUserId:
        request.headers.get("x-driver-id")?.trim() || trustedActorUserId(request),
      actorRole: "driver",
    };

    if (expectedDriverId) {
      return enforceExpectedDriverIdentity(request, expectedDriverId, base);
    }

    return base;
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

  const devBase: ApiAuthSuccess = {
    ok: true,
    mode: "dev_open",
    actorUserId:
      request.headers.get("x-driver-id")?.trim() || trustedActorUserId(request),
    actorRole: "driver",
  };

  if (expectedDriverId) {
    return enforceExpectedDriverIdentity(request, expectedDriverId, devBase);
  }

  return devBase;
}
