import type { ItemSize, Urgency } from "@door-in-four/types";

export interface QuoteInput {
  routeDistanceMiles: number;
  routeDurationMinutes: number;
  itemSize: ItemSize;
  approximateWeightKg: number;
  quantity: number;
  urgency: Urgency;
  requiresVan: boolean;
  fragile: boolean;
  pickupStairsFloors: number;
  deliveryStairsFloors: number;
  requiresTwoPeople: boolean;
  sameTown: boolean;
  manualAdjustment?: number;
}

export interface QuoteResult {
  subtotal: number;
  baseFee: number;
  distanceFee: number;
  itemSizeFee: number;
  urgencyFee: number;
  vanSurcharge: number;
  heavyItemSurcharge: number;
  stairsSurcharge: number;
  fragileItemSurcharge: number;
  twoPersonSurcharge: number;
  waitingTimeEstimate: number;
  platformServiceFee: number;
  vat: number;
  totalBuyerPrice: number;
  driverPayoutEstimate: number;
  platformMarginEstimate: number;
  quoteExpiryMinutes: number;
  breakdown: string[];
}

const baseFeeMap: Record<ItemSize, number> = { small: 7, medium: 11, large: 18, furniture: 28, van_load: 38 };
const distanceRateMap: Record<ItemSize, number> = { small: 1.1, medium: 1.45, large: 2.1, furniture: 2.75, van_load: 3.25 };
const itemMultiplierMap: Record<ItemSize, number> = { small: 1, medium: 1.12, large: 1.35, furniture: 1.65, van_load: 2.25 };
const urgencyMap: Record<Urgency, number> = { flexible: 0.9, scheduled: 1, tomorrow: 1.05, same_day: 1.15, asap: 1.25 };

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function calculateQuote(input: QuoteInput): QuoteResult {
  const pickupStairs = clamp(input.pickupStairsFloors, 0, 4);
  const deliveryStairs = clamp(input.deliveryStairsFloors, 0, 4);
  const totalStairs = pickupStairs + deliveryStairs;

  const baseFee = baseFeeMap[input.itemSize] * input.quantity;
  const extraMiles = Math.max(0, input.routeDistanceMiles - 3);
  const distanceFee = extraMiles * distanceRateMap[input.itemSize];
  const itemSizeFee = (baseFee + distanceFee) * (itemMultiplierMap[input.itemSize] - 1);
  const urgencyFee = (baseFee + distanceFee + itemSizeFee) * (urgencyMap[input.urgency] - 1);
  const vanSurcharge = input.requiresVan ? 10 : 0;
  const heavyItemSurcharge = input.approximateWeightKg > 50 ? 18 : input.approximateWeightKg > 25 ? 8 : 0;
  const stairsSurcharge = totalStairs * 3;
  const fragileItemSurcharge = input.fragile ? 5 : 0;
  const twoPersonSurcharge = input.requiresTwoPeople ? 25 : 0;
  const waitingTimeEstimate = Math.max(0, input.routeDurationMinutes - 15) * 0.25;

  let subtotal =
    baseFee +
    distanceFee +
    itemSizeFee +
    urgencyFee +
    vanSurcharge +
    heavyItemSurcharge +
    stairsSurcharge +
    fragileItemSurcharge +
    twoPersonSurcharge +
    waitingTimeEstimate +
    (input.manualAdjustment ?? 0);

  const minimum =
    input.itemSize === "small"
      ? input.sameTown
        ? 10
        : 15
      : input.itemSize === "medium"
        ? input.sameTown
          ? 16
          : 22
        : input.itemSize === "large"
          ? 32
          : input.itemSize === "furniture"
            ? 45
            : 55;
  subtotal = Math.max(subtotal, minimum);

  const platformServiceFee = Math.max(1.5, subtotal * 0.1);
  const vat = 0;
  const totalBuyerPrice = subtotal + platformServiceFee + vat;
  const driverPayoutEstimate = subtotal * 0.78;
  const platformMarginEstimate = totalBuyerPrice - driverPayoutEstimate;

  return {
    subtotal: round(subtotal),
    baseFee: round(baseFee),
    distanceFee: round(distanceFee),
    itemSizeFee: round(itemSizeFee),
    urgencyFee: round(urgencyFee),
    vanSurcharge: round(vanSurcharge),
    heavyItemSurcharge: round(heavyItemSurcharge),
    stairsSurcharge: round(stairsSurcharge),
    fragileItemSurcharge: round(fragileItemSurcharge),
    twoPersonSurcharge: round(twoPersonSurcharge),
    waitingTimeEstimate: round(waitingTimeEstimate),
    platformServiceFee: round(platformServiceFee),
    vat,
    totalBuyerPrice: round(totalBuyerPrice),
    driverPayoutEstimate: round(driverPayoutEstimate),
    platformMarginEstimate: round(platformMarginEstimate),
    quoteExpiryMinutes: 20,
    breakdown: [
      `Base fee £${round(baseFee)}`,
      `Distance fee £${round(distanceFee)}`,
      `Stairs/access fee £${round(stairsSurcharge)}`,
      `Platform fee £${round(platformServiceFee)}`,
      `Total £${round(totalBuyerPrice)}`
    ]
  };
}
