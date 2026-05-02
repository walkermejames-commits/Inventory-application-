import { describe, expect, it } from "vitest";
import { calculateDriverPayout, isQuoteExpired, shouldProcessWebhook, verifyDelivery, verifyHandover } from "./src/index";

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
