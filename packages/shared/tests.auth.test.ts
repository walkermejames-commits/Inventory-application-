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
    const result = requireAdminApiAuth(req({ authorization: "Bearer test-secret-value" }));
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

describe("requireMobileApiAuth", () => {
  it("accepts mobile secret and enforces driver header match", () => {
    process.env.MOBILE_API_SECRET = "mobile-secret";
    const ok = requireMobileApiAuth(
      req({ "x-api-key": "mobile-secret", "x-driver-id": "driver-a" }),
      { expectedDriverId: "driver-a" }
    );
    expect(ok.ok).toBe(true);

    const bad = requireMobileApiAuth(
      req({ "x-api-key": "mobile-secret", "x-driver-id": "driver-b" }),
      { expectedDriverId: "driver-a" }
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.status).toBe(403);
  });

  it("accepts admin secret as fallback for mobile", () => {
    process.env.ADMIN_API_SECRET = "admin-secret";
    delete process.env.MOBILE_API_SECRET;
    const result = requireMobileApiAuth(req({ "x-api-key": "admin-secret" }));
    expect(result.ok).toBe(true);
  });
});
