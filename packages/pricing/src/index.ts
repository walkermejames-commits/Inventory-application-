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

const baseFeeMap: Record<ItemSize, number> = { small: 8, medium: 14, large: 22, furniture: 35, van_load: 35 };
const distanceRateMap: Record<ItemSize, number> = { small: 1.5, medium: 2, large: 2.75, furniture: 3.5, van_load: 3.5 };
const itemMultiplierMap: Record<ItemSize, number> = { small: 1, medium: 1.25, large: 1.6, furniture: 2, van_load: 2.75 };
const urgencyMap: Record<Urgency, number> = { flexible: 0.9, scheduled: 1, tomorrow: 1.05, same_day: 1.2, asap: 1.35 };

const round = (n: number) => Math.round(n * 100) / 100;

export function calculateQuote(input: QuoteInput): QuoteResult {
  const baseFee = baseFeeMap[input.itemSize] * input.quantity;
  const extraMiles = Math.max(0, input.routeDistanceMiles - 3);
  const distanceFee = extraMiles * distanceRateMap[input.itemSize];
  const itemSizeFee = (baseFee + distanceFee) * (itemMultiplierMap[input.itemSize] - 1);
  const urgencyFee = (baseFee + distanceFee + itemSizeFee) * (urgencyMap[input.urgency] - 1);
  const vanSurcharge = input.requiresVan ? 15 : 0;
  const heavyItemSurcharge = input.approximateWeightKg > 50 ? 25 : input.approximateWeightKg > 25 ? 10 : 0;
  const stairsSurcharge = (input.pickupStairsFloors + input.deliveryStairsFloors) * 5;
  const fragileItemSurcharge = input.fragile ? 6 : 0;
  const twoPersonSurcharge = input.requiresTwoPeople ? 35 : 0;
  const waitingTimeEstimate = Math.max(0, input.routeDurationMinutes - 10) * 0.5;

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
        ? 12
        : 18
      : input.itemSize === "medium"
        ? 25
        : input.itemSize === "large"
          ? 40
          : 55;
  subtotal = Math.max(subtotal, minimum);

  const platformServiceFee = Math.max(2, subtotal * 0.12);
  const vat = 0;
  const totalBuyerPrice = subtotal + platformServiceFee + vat;
  const driverPayoutEstimate = subtotal * 0.75;
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
      `Platform fee £${round(platformServiceFee)}`,
      `Total £${round(totalBuyerPrice)}`
    ]
  };
}
