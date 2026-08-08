import { describe, expect, it } from "vitest";
import {
  assertStrictDriverPath,
  buildStrictDriverProgressPath,
  canDriverReachPayoutReady,
  canDriverWalkPath,
  canSetPayoutReady,
  DRIVER_STATUS_CHAIN,
  hasCompletedRequiredDriverVerifications,
  isAdminStatusTransitionAllowed,
  isDriverStatusTransitionAllowed,
} from "./src/booking-lifecycle";

describe("driver status transitions — no skipping", () => {
  it("rejects driver_assigned → completed", () => {
    expect(isDriverStatusTransitionAllowed("driver_assigned", "completed")).toBe(false);
  });

  it("rejects driver_en_route_to_pickup → delivered", () => {
    expect(
      isDriverStatusTransitionAllowed("driver_en_route_to_pickup", "delivered")
    ).toBe(false);
  });

  it("rejects skipping pickup verification stages", () => {
    // cannot jump past pickup_verified
    expect(
      isDriverStatusTransitionAllowed("driver_arrived_at_pickup", "item_collected")
    ).toBe(false);
    expect(
      isDriverStatusTransitionAllowed("driver_en_route_to_pickup", "pickup_verified")
    ).toBe(false);
    expect(
      isDriverStatusTransitionAllowed("driver_assigned", "pickup_verified")
    ).toBe(false);
  });

  it("rejects skipping delivery verification", () => {
    expect(
      isDriverStatusTransitionAllowed("driver_arrived_at_delivery", "delivered")
    ).toBe(false);
    expect(
      isDriverStatusTransitionAllowed("driver_en_route_to_delivery", "delivery_verified")
    ).toBe(false);
    expect(
      isDriverStatusTransitionAllowed("item_collected", "delivery_verified")
    ).toBe(false);
    expect(
      isDriverStatusTransitionAllowed("delivery_verified", "completed")
    ).toBe(false);
  });

  it("allows only the exact next step", () => {
    expect(
      isDriverStatusTransitionAllowed("driver_assigned", "driver_en_route_to_pickup")
    ).toBe(true);
    expect(
      isDriverStatusTransitionAllowed("driver_arrived_at_pickup", "pickup_verified")
    ).toBe(true);
    expect(
      isDriverStatusTransitionAllowed("driver_arrived_at_delivery", "delivery_verified")
    ).toBe(true);
    expect(isDriverStatusTransitionAllowed("delivered", "completed")).toBe(true);
  });

  it("allows the full strict chain from assigned to completed", () => {
    const path = buildStrictDriverProgressPath();
    expect(path[0]).toBe("driver_assigned");
    expect(path[path.length - 1]).toBe("completed");
    expect(path).toContain("pickup_verified");
    expect(path).toContain("delivery_verified");
    expect(() => assertStrictDriverPath(path)).not.toThrow();
    expect(canDriverWalkPath("driver_assigned", path.slice(1))).toBe(true);
  });

  it("does not allow payout ready through a skipped lifecycle", () => {
    // Direct jump never legal for driver
    expect(canDriverReachPayoutReady("driver_assigned", "completed")).toBe(false);
    expect(canDriverReachPayoutReady("driver_en_route_to_pickup", "completed")).toBe(
      false
    );
    expect(canDriverReachPayoutReady("pickup_verified", "completed")).toBe(false);
    expect(canDriverReachPayoutReady("delivery_verified", "completed")).toBe(false);

    // Only delivered → completed is the legal final driver step
    expect(canDriverReachPayoutReady("delivered", "completed")).toBe(true);
    expect(canSetPayoutReady("completed")).toBe(true);
    expect(canSetPayoutReady("delivered")).toBe(false);

    // Skipped path cannot claim required verifications
    expect(
      hasCompletedRequiredDriverVerifications([
        "driver_assigned",
        "completed",
      ] as const)
    ).toBe(false);

    expect(
      hasCompletedRequiredDriverVerifications(DRIVER_STATUS_CHAIN)
    ).toBe(true);
  });
});

describe("admin status transitions — privileged override", () => {
  it("still allows deliberate forward skips for ops", () => {
    expect(
      isAdminStatusTransitionAllowed("paid_awaiting_dispatch", "driver_assigned")
    ).toBe(true);
    // Ops may jump for support interventions (not available on driver progress API)
    expect(isAdminStatusTransitionAllowed("driver_assigned", "completed")).toBe(true);
    expect(
      isAdminStatusTransitionAllowed("driver_en_route_to_pickup", "delivered")
    ).toBe(true);
  });

  it("still blocks reverse transitions", () => {
    expect(isAdminStatusTransitionAllowed("item_collected", "quote_created")).toBe(
      false
    );
  });

  it("allows terminal dispute/cancel from in-progress jobs", () => {
    expect(isAdminStatusTransitionAllowed("driver_assigned", "cancelled")).toBe(true);
    expect(isAdminStatusTransitionAllowed("item_collected", "disputed")).toBe(true);
  });
});
