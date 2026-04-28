import { describe, expect, it } from "vitest";
import { computeCancellationFee, isStatusTransitionAllowed } from "./src/index";

describe("booking status transitions", () => {
  it("allows forward transitions", () => {
    expect(isStatusTransitionAllowed("paid_awaiting_dispatch", "driver_assigned")).toBe(true);
  });

  it("blocks reverse transitions", () => {
    expect(isStatusTransitionAllowed("item_collected", "quote_created")).toBe(false);
  });
});

describe("cancellation fee logic", () => {
  it("applies no fee before assignment", () => {
    expect(computeCancellationFee("paid_awaiting_dispatch", 100)).toBe(0);
  });

  it("applies fee when en route", () => {
    expect(computeCancellationFee("driver_en_route_to_pickup", 100)).toBe(15);
  });
});
