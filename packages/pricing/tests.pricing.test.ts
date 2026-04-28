import { describe, expect, it } from "vitest";
import { calculateQuote } from "./src/index";

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
      sameTown: false
    });

    expect(quote.totalBuyerPrice).toBeGreaterThan(quote.subtotal);
    expect(quote.quoteExpiryMinutes).toBe(20);
    expect(quote.driverPayoutEstimate).toBe(quote.subtotal * 0.75);
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
      sameTown: true
    });

    expect(quote.subtotal).toBeGreaterThanOrEqual(12);
  });
});
