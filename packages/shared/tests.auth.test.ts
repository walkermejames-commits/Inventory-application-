import { afterEach, describe, expect, it } from "vitest";
import { requireAdminApiAuth, requireMobileApiAuth } from "./src/auth";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", { headers });
}

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  delete process.env.ADMIN_API_SECRET;
  delete process.env.MOBILE_API_SECRET;
  delete process.env.NODE_ENV;
});

describe("requireAdminApiAuth", () => {
  it("rejects missing key when secret is configured", () => {
    process.env.ADMIN_API_SECRET = "test-secret-value";
    process.env.NODE_ENV = "production";
    const result = requireAdminApiAuth(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("accepts x-api-key matching secret", () => {
    process.env.ADMIN_API_SECRET = "test-secret-value";
    const result = requireAdminApiAuth(req({ "x-api-key": "test-secret-value" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe("api_key");
      expect(result.actorRole).toBe("admin");
    }
  });

  it("accepts Bearer token", () => {
    process.env.ADMIN_API_SECRET = "test-secret-value";
    const result = requireAdminApiAuth(
      req({ authorization: "Bearer test-secret-value" })
    );
    expect(result.ok).toBe(true);
  });

  it("reads actor only from trusted header after auth", () => {
    process.env.ADMIN_API_SECRET = "test-secret-value";
    const result = requireAdminApiAuth(
      req({
        "x-api-key": "test-secret-value",
        "x-actor-user-id": "11111111-1111-4111-8111-111111111111",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorUserId).toBe("11111111-1111-4111-8111-111111111111");
    }
  });

  it("fails closed in production when secret missing", () => {
    delete process.env.ADMIN_API_SECRET;
    process.env.NODE_ENV = "production";
    const result = requireAdminApiAuth(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it("allows dev_open when secret missing outside production", () => {
    delete process.env.ADMIN_API_SECRET;
    process.env.NODE_ENV = "development";
    const result = requireAdminApiAuth(req());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mode).toBe("dev_open");
  });
});

describe("requireMobileApiAuth — driver identity", () => {
  it("allows correct driver id with mobile secret", () => {
    process.env.MOBILE_API_SECRET = "mobile-secret";
    const ok = requireMobileApiAuth(
      req({ "x-api-key": "mobile-secret", "x-driver-id": "driver-a" }),
      { expectedDriverId: "driver-a" }
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.mode).toBe("mobile_key");
      expect(ok.actorUserId).toBe("driver-a");
      expect(ok.actorRole).toBe("driver");
    }
  });

  it("rejects wrong driver id with 403", () => {
    process.env.MOBILE_API_SECRET = "mobile-secret";
    const bad = requireMobileApiAuth(
      req({ "x-api-key": "mobile-secret", "x-driver-id": "driver-b" }),
      { expectedDriverId: "driver-a" }
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.status).toBe(403);
      expect(bad.error).toMatch(/mismatch/i);
    }
  });

  it("rejects missing driver id when expectedDriverId is supplied", () => {
    process.env.MOBILE_API_SECRET = "mobile-secret";
    const missing = requireMobileApiAuth(req({ "x-api-key": "mobile-secret" }), {
      expectedDriverId: "driver-a",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.status).toBe(401);
      expect(missing.error).toMatch(/identity required/i);
    }
  });

  it("does not allow mobile secret alone to act as an arbitrary driver", () => {
    process.env.MOBILE_API_SECRET = "mobile-secret";
    // Valid secret but no identity → cannot target a driver-scoped resource
    const result = requireMobileApiAuth(req({ "x-api-key": "mobile-secret" }), {
      expectedDriverId: "any-driver",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts admin secret as fallback key for mobile (intentional)", () => {
    process.env.ADMIN_API_SECRET = "admin-secret";
    delete process.env.MOBILE_API_SECRET;
    // Without expectedDriverId — admin secret authenticates the client
    const noScope = requireMobileApiAuth(req({ "x-api-key": "admin-secret" }));
    expect(noScope.ok).toBe(true);
    if (noScope.ok) {
      expect(noScope.mode).toBe("api_key");
    }
  });

  it("still requires x-driver-id when using admin secret with expectedDriverId", () => {
    process.env.ADMIN_API_SECRET = "admin-secret";
    delete process.env.MOBILE_API_SECRET;

    const missingIdentity = requireMobileApiAuth(
      req({ "x-api-key": "admin-secret" }),
      { expectedDriverId: "driver-a" }
    );
    expect(missingIdentity.ok).toBe(false);
    if (!missingIdentity.ok) expect(missingIdentity.status).toBe(401);

    const wrongIdentity = requireMobileApiAuth(
      req({ "x-api-key": "admin-secret", "x-driver-id": "driver-b" }),
      { expectedDriverId: "driver-a" }
    );
    expect(wrongIdentity.ok).toBe(false);
    if (!wrongIdentity.ok) expect(wrongIdentity.status).toBe(403);

    const correct = requireMobileApiAuth(
      req({ "x-api-key": "admin-secret", "x-driver-id": "driver-a" }),
      { expectedDriverId: "driver-a" }
    );
    expect(correct.ok).toBe(true);
    if (correct.ok) {
      expect(correct.mode).toBe("api_key");
      expect(correct.actorUserId).toBe("driver-a");
    }
  });
});
