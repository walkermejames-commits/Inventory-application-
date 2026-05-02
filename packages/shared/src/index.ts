import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import type { BookingStatus } from "@door-in-four/types";

export const createSupabaseServerClient = (url: string, serviceKey: string) => createClient(url, serviceKey);

export const createStripeClient = (secretKey: string) =>
  new Stripe(secretKey, {
    apiVersion: "2024-06-20"
  });

export const quoteRequestSchema = z.object({
  buyerId: z.string().uuid(),
  pickupTown: z.string().min(2),
  deliveryTown: z.string().min(2),
  pickupPostcode: z.string().min(3),
  deliveryPostcode: z.string().min(3),
  itemSize: z.enum(["small", "medium", "large", "furniture", "van_load"]),
  approximateWeightKg: z.number().min(0),
  quantity: z.number().int().min(1),
  urgency: z.enum(["flexible", "scheduled", "tomorrow", "same_day", "asap"]),
  routeDistanceMiles: z.number().min(0),
  routeDurationMinutes: z.number().min(1),
  fragile: z.boolean(),
  pickupStairsFloors: z.number().int().min(0),
  deliveryStairsFloors: z.number().int().min(0),
  requiresTwoPeople: z.boolean(),
  requiresVan: z.boolean()
});

const orderedStatuses: BookingStatus[] = [
  "draft",
  "quote_requested",
  "quote_created",
  "awaiting_payment",
  "paid_awaiting_dispatch",
  "driver_assigned",
  "driver_en_route_to_pickup",
  "driver_arrived_at_pickup",
  "pickup_verified",
  "item_collected",
  "driver_en_route_to_delivery",
  "driver_arrived_at_delivery",
  "delivery_verified",
  "delivered",
  "completed"
];

export function isStatusTransitionAllowed(from: BookingStatus, to: BookingStatus) {
  if (["cancelled", "disputed", "refunded"].includes(from)) return false;
  if (["cancelled", "disputed", "refunded"].includes(to)) return true;
  return orderedStatuses.indexOf(to) >= orderedStatuses.indexOf(from);
}

export function computeCancellationFee(status: BookingStatus, totalAmount: number) {
  if (["draft", "quote_created", "awaiting_payment", "paid_awaiting_dispatch"].includes(status)) return 0;
  if (["driver_assigned"].includes(status)) return Math.min(5, totalAmount * 0.1);
  if (["driver_en_route_to_pickup", "driver_arrived_at_pickup"].includes(status)) return Math.min(15, totalAmount * 0.2);
  return totalAmount;
}

export function isQuoteExpired(expiresAtIso: string, now = new Date()) {
  return new Date(expiresAtIso).getTime() <= now.getTime();
}

export function shouldProcessWebhook(existingStatus: string | null | undefined, targetStatus: string) {
  return existingStatus !== targetStatus;
}

export function verifyHandover(inputCode: string, expectedCode: string, hasPhoto: boolean) {
  return inputCode === expectedCode && hasPhoto;
}

export function verifyDelivery(inputCode: string, expectedCode: string, hasPhoto: boolean) {
  return inputCode === expectedCode && hasPhoto;
}

export function calculateDriverPayout(subtotal: number, adminOverride?: number) {
  return adminOverride ?? Math.round(subtotal * 0.75 * 100) / 100;
}

export function toPence(amountGbp: number) {
  return Math.round(amountGbp * 100);
}

export function canDispatch(paymentStatus: string, bookingStatus: string) {
  return paymentStatus === "paid" && bookingStatus === "paid_awaiting_dispatch";
}

export function canPayQuote(expiresAtIso: string) {
  return !isQuoteExpired(expiresAtIso);
}

export function canSetPayoutReady(bookingStatus: string) {
  return bookingStatus === "completed";
}
