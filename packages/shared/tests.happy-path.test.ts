import { describe, expect, it } from "vitest";
import {
  assertHappyPathTransitions,
  buildHappyPathSteps,
  canDispatch,
  canSetPayoutReady,
  isStatusTransitionAllowed,
  shouldProcessWebhook,
  statusAfterPaymentConfirmed,
} from "./src/booking-lifecycle";
import {
  calculateDriverPayout,
  computeCancellationFee,
  toPence,
  verifyDelivery,
  verifyHandover,
} from "./src/index";
import { DRIVER_PAYOUT_RATIO, calculateDriverPayoutAmount } from "@door-in-four/types";

describe("canonical happy path (buyer-led)", () => {
  it("transitions cleanly from open quote to completed/payout_ready", () => {
    const steps = buildHappyPathSteps("buyer_led");
    expect(steps[0].bookingStatus).toBe("seller_quote_pending");
    expect(() => assertHappyPathTransitions(steps)).not.toThrow();

    // Payment webhook step
    const paid = statusAfterPaymentConfirmed();
    expect(canDispatch(paid.paymentStatus, paid.bookingStatus)).toBe(true);
    expect(shouldProcessWebhook("payment_pending", "paid")).toBe(true);
    expect(shouldProcessWebhook("paid", "paid")).toBe(false);
  });

  it("supports admin_quote origin as well", () => {
    const steps = buildHappyPathSteps("admin_quote");
    expect(steps[0].bookingStatus).toBe("quote_created");
    expect(() => assertHappyPathTransitions(steps)).not.toThrow();
  });
});

describe("status machine guards (admin/ops rules)", () => {
  it("blocks transitions out of terminal states", () => {
    expect(isStatusTransitionAllowed("cancelled", "driver_assigned")).toBe(false);
    expect(isStatusTransitionAllowed("completed", "cancelled")).toBe(true);
  });

  it("allows seller_quote_pending → awaiting_payment", () => {
    expect(isStatusTransitionAllowed("seller_quote_pending", "awaiting_payment")).toBe(true);
  });
});

// Driver skip regressions live in tests.driver-transitions.test.ts

describe("money path rules", () => {
  it("uses a single 75% driver payout ratio", () => {
    expect(DRIVER_PAYOUT_RATIO).toBe(0.75);
    expect(calculateDriverPayoutAmount(100)).toBe(75);
    expect(calculateDriverPayout(100)).toBe(75);
    expect(calculateDriverPayout(100, 60)).toBe(60);
  });

  it("converts GBP to pence for Stripe", () => {
    expect(toPence(96.35)).toBe(9635);
  });

  it("requires code + photo for handover and delivery", () => {
    expect(verifyHandover("123456", "123456", true)).toBe(true);
    expect(verifyHandover("123456", "123456", false)).toBe(false);
    expect(verifyDelivery("654321", "000000", true)).toBe(false);
  });

  it("only marks payout ready after completed", () => {
    expect(canSetPayoutReady("completed")).toBe(true);
    expect(canSetPayoutReady("delivered")).toBe(false);
  });

  it("applies cancellation fee once driver is en route", () => {
    expect(computeCancellationFee("paid_awaiting_dispatch", 100)).toBe(0);
    expect(computeCancellationFee("driver_en_route_to_pickup", 100)).toBe(15);
  });
});
