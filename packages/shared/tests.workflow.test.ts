import { describe, expect, it } from "vitest";
import { calculateDriverPayout, isQuoteExpired, shouldProcessWebhook, verifyDelivery, verifyHandover, canPayQuote, canDispatch, canSetPayoutReady } from "./src/index";

describe("quote expiry", () => {
  it("expires old quotes", () => {
    expect(isQuoteExpired("2020-01-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });
});

describe("webhook idempotency", () => {
  it("skips already applied transition", () => {
    expect(shouldProcessWebhook("paid", "paid")).toBe(false);
  });
});

describe("handover/delivery verification", () => {
  it("requires code and photo", () => {
    expect(verifyHandover("1234", "1234", true)).toBe(true);
    expect(verifyDelivery("1234", "1111", true)).toBe(false);
  });
});

describe("driver payout calculation", () => {
  it("uses 75% default", () => {
    expect(calculateDriverPayout(100)).toBe(75);
  });
});

describe("quote acceptance", () => {
  it("allows paying non-expired quote", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(canPayQuote(future)).toBe(true);
  });
  it("blocks paying expired quote", () => {
    expect(canPayQuote("2020-01-01T00:00:00.000Z")).toBe(false);
  });
});

describe("payment intent creation and webhook paid transition", () => {
  it("processes new paid webhook transition", () => {
    expect(shouldProcessWebhook("awaiting_payment", "paid")).toBe(true);
  });
});

describe("dispatch assignment", () => {
  it("allows dispatch only when paid and awaiting dispatch", () => {
    expect(canDispatch("paid", "paid_awaiting_dispatch")).toBe(true);
    expect(canDispatch("paid", "driver_assigned")).toBe(false);
  });
});

describe("driver proof completion and payout ready", () => {
  it("verifies delivery proof", () => {
    expect(verifyDelivery("ABCD", "ABCD", true)).toBe(true);
  });
  it("marks payout ready only on completed", () => {
    expect(canSetPayoutReady("completed")).toBe(true);
    expect(canSetPayoutReady("driver_en_route_to_delivery")).toBe(false);
  });
});
