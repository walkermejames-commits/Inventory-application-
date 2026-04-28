import { describe, expect, it } from "vitest";
import {
  canDispatch,
  canPayQuote,
  canSetPayoutReady,
  computeCancellationFee,
  shouldProcessWebhook,
  toPence,
  verifyDelivery,
  verifyHandover
} from "./src/index";

describe("payment and quote rules", () => {
  it("prevents paying expired quote", () => {
    expect(canPayQuote("2020-01-01T00:00:00.000Z")).toBe(false);
  });

  it("converts accepted quote amount to pence", () => {
    expect(toPence(96.35)).toBe(9635);
  });

  it("is idempotent on duplicate webhook", () => {
    expect(shouldProcessWebhook("paid", "paid")).toBe(false);
  });
});

describe("dispatch and transition guards", () => {
  it("blocks dispatch for unpaid bookings", () => {
    expect(canDispatch("payment_pending", "paid_awaiting_dispatch")).toBe(false);
  });

  it("allows dispatch for paid booking awaiting dispatch", () => {
    expect(canDispatch("paid", "paid_awaiting_dispatch")).toBe(true);
  });
});

describe("handover and delivery code requirements", () => {
  it("requires seller handover code and photo", () => {
    expect(verifyHandover("1234", "1234", true)).toBe(true);
    expect(verifyHandover("1234", "1234", false)).toBe(false);
  });

  it("requires buyer delivery code and photo", () => {
    expect(verifyDelivery("5678", "5678", true)).toBe(true);
    expect(verifyDelivery("5678", "0000", true)).toBe(false);
  });
});

describe("refund and payout rules", () => {
  it("computes cancellation fee once driver en route", () => {
    expect(computeCancellationFee("driver_en_route_to_pickup", 100)).toBe(15);
  });

  it("marks payout ready only when completed", () => {
    expect(canSetPayoutReady("completed")).toBe(true);
    expect(canSetPayoutReady("delivered")).toBe(false);
  });
});
