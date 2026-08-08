import { afterEach, describe, expect, it } from "vitest";
import {
  calculateDriverPayout,
  canDispatch,
  canSetPayoutReady,
  DRIVER_PAYOUT_RATIO,
  isDriverStatusTransitionAllowed,
  isLocalDevicePhotoPath,
  isServerProofStoragePath,
  requireAdminApiAuth,
  requireMobileApiAuth,
  statusAfterPaymentConfirmed,
} from "./src/index";

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

describe("integration boundaries — admin auth required", () => {
  it("rejects unauthenticated access when ADMIN_API_SECRET is set", () => {
    process.env.ADMIN_API_SECRET = "admin-secret-value";
    process.env.NODE_ENV = "production";
    const result = requireAdminApiAuth(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("accepts admin secret for protected list/notes/audit/disputes style routes", () => {
    process.env.ADMIN_API_SECRET = "admin-secret-value";
    const result = requireAdminApiAuth(req({ "x-api-key": "admin-secret-value" }));
    expect(result.ok).toBe(true);
  });
});

describe("integration boundaries — driver identity", () => {
  it("requires x-driver-id when expectedDriverId is set", () => {
    process.env.MOBILE_API_SECRET = "mobile-secret";
    expect(
      requireMobileApiAuth(req({ "x-api-key": "mobile-secret" }), {
        expectedDriverId: "driver-1",
      }).ok
    ).toBe(false);
  });
});

describe("integration boundaries — driver lifecycle + evidence paths", () => {
  it("blocks skip to completed and requires adjacent steps", () => {
    expect(isDriverStatusTransitionAllowed("driver_assigned", "completed")).toBe(false);
    expect(
      isDriverStatusTransitionAllowed("driver_arrived_at_pickup", "pickup_verified")
    ).toBe(true);
    expect(
      isDriverStatusTransitionAllowed("driver_arrived_at_delivery", "delivery_verified")
    ).toBe(true);
    expect(isDriverStatusTransitionAllowed("delivered", "completed")).toBe(true);
  });

  it("rejects local device photo paths and accepts storage keys", () => {
    expect(isLocalDevicePhotoPath("file:///var/mobile/photo.jpg")).toBe(true);
    expect(isLocalDevicePhotoPath("content://media/1")).toBe(true);
    expect(isLocalDevicePhotoPath("proofs/booking/pickup.jpg")).toBe(false);
    expect(isServerProofStoragePath("proofs/b1/pickup_proof-1.jpg")).toBe(true);
    expect(isServerProofStoragePath("file:///tmp/x.jpg")).toBe(false);
  });
});

describe("integration boundaries — money + payment → dispatch → payout", () => {
  it("keeps driver payout at canonical 75%", () => {
    expect(DRIVER_PAYOUT_RATIO).toBe(0.75);
    expect(calculateDriverPayout(100)).toBe(75);
    expect(calculateDriverPayout(86)).toBe(64.5);
  });

  it("payment confirmation yields dispatchable booking", () => {
    const paid = statusAfterPaymentConfirmed();
    expect(canDispatch(paid.paymentStatus, paid.bookingStatus)).toBe(true);
  });

  it("payout ready only when completed", () => {
    expect(canSetPayoutReady("completed")).toBe(true);
    expect(canSetPayoutReady("delivered")).toBe(false);
    expect(canSetPayoutReady("delivery_verified")).toBe(false);
  });
});
