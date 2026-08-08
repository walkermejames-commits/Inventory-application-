import { describe, expect, it } from "vitest";
import { calculateQuote } from "./src/index";
import { DRIVER_PAYOUT_RATIO } from "@door-in-four/types";

describe("calculateQuote", () => {
  it("calculates a valid furniture quote", () => {
    const quote = calculateQuote({
      routeDistanceMiles: 10,
      routeDurationMinutes: 30,
      itemSize: "furniture",
      approximateWeightKg: 40,
      quantity: 1,
      urgency: "scheduled",
      requiresVan: true,
      fragile: false,
      pickupStairsFloors: 1,
      deliveryStairsFloors: 0,
      requiresTwoPeople: true,
      sameTown: false,
    });

    expect(quote.totalBuyerPrice).toBeGreaterThan(quote.subtotal);
    expect(quote.quoteExpiryMinutes).toBe(20);
    expect(quote.driverPayoutRatio).toBe(DRIVER_PAYOUT_RATIO);
    expect(quote.driverPayoutRatio).toBe(0.75);
    expect(quote.driverPayoutEstimate).toBeCloseTo(quote.subtotal * 0.75, 2);
  });

  it("aligns driver payout with shared DRIVER_PAYOUT_RATIO constant", () => {
    const quote = calculateQuote({
      routeDistanceMiles: 5,
      routeDurationMinutes: 20,
      itemSize: "medium",
      approximateWeightKg: 10,
      quantity: 1,
      urgency: "scheduled",
      requiresVan: false,
      fragile: false,
      pickupStairsFloors: 0,
      deliveryStairsFloors: 0,
      requiresTwoPeople: false,
      sameTown: true,
    });
    expect(DRIVER_PAYOUT_RATIO).toBe(0.75);
    // Allow 1p rounding on GBP; ratio must still be 75%
    expect(quote.driverPayoutEstimate / quote.subtotal).toBeCloseTo(DRIVER_PAYOUT_RATIO, 2);
  });

  it("enforces same-town small minimum", () => {
    const quote = calculateQuote({
      routeDistanceMiles: 1,
      routeDurationMinutes: 8,
      itemSize: "small",
      approximateWeightKg: 2,
      quantity: 1,
      urgency: "flexible",
      requiresVan: false,
      fragile: false,
      pickupStairsFloors: 0,
      deliveryStairsFloors: 0,
      requiresTwoPeople: false,
      sameTown: true,
    });

    // Pricing engine minimum for same-town small is £10
    expect(quote.subtotal).toBeGreaterThanOrEqual(10);
  });
});
