import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { z } from "zod";
import type { BookingStatus } from "@door-in-four/types";

export const createSupabaseServerClient = (url: string, serviceKey: string) => createClient(url, serviceKey);

export const createStripeClient = (secretKey: string) =>
  new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia"
  });

export const SECURITY_LIMITS = {
  NAME: 120,
  EMAIL: 180,
  PHONE: 40,
  TOWN: 120,
  POSTCODE: 12,
  ADDRESS: 250,
  NOTES: 1000,
  ITEM_TITLE: 180,
  ITEM_SIZE: 40,
  VEHICLE_REGISTRATION: 20,
  VEHICLE_DETAIL: 80,
  URL: 1000,
  UUID: 64,
};

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const HTML_TAGS = /<[^>]*>/g;
const MULTISPACE = /\s+/g;

function stripDangerousText(input: unknown, maxLength: number) {
  if (typeof input !== "string") return "";

  return input
    .replace(HTML_TAGS, "")
    .replace(CONTROL_CHARS, "")
    .replace(MULTISPACE, " ")
    .trim()
    .slice(0, maxLength);
}

function keepOnly(input: string, allowed: RegExp) {
  return Array.from(input).filter((character) => allowed.test(character)).join("");
}

export function cleanText(input: unknown, maxLength = SECURITY_LIMITS.NOTES) {
  return stripDangerousText(input, maxLength);
}

export function cleanName(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.NAME);
}

export function cleanEmail(input: unknown) {
  const cleaned = stripDangerousText(input, SECURITY_LIMITS.EMAIL).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : "";
}

export function cleanPhone(input: unknown) {
  return keepOnly(stripDangerousText(input, SECURITY_LIMITS.PHONE), /[+0-9()\-\s]/);
}

export function cleanTown(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.TOWN);
}

export function cleanPostcode(input: unknown) {
  return keepOnly(stripDangerousText(input, SECURITY_LIMITS.POSTCODE).toUpperCase(), /[A-Z0-9\s]/).trim();
}

export function cleanAddress(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.ADDRESS);
}

export function cleanNotes(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.NOTES);
}

export function cleanItemTitle(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.ITEM_TITLE);
}

export function cleanItemSize(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.ITEM_SIZE).toLowerCase();
}

export function cleanVehicleRegistration(input: unknown) {
  return keepOnly(stripDangerousText(input, SECURITY_LIMITS.VEHICLE_REGISTRATION).toUpperCase(), /[A-Z0-9\s]/).trim();
}

export function cleanVehicleDetail(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.VEHICLE_DETAIL);
}

export function cleanUrl(input: unknown) {
  const cleaned = stripDangerousText(input, SECURITY_LIMITS.URL);
  if (!cleaned) return "";

  try {
    const url = new URL(cleaned);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function cleanUUID(input: unknown) {
  const cleaned = stripDangerousText(input, SECURITY_LIMITS.UUID);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)
    ? cleaned
    : "";
}

export function cleanBoolean(input: unknown) {
  return input === true || input === "true" || input === "on" || input === "1";
}

export function clampNumber(input: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function cleanEnum<T extends string>(input: unknown, allowed: readonly T[], fallback: T) {
  const cleaned = stripDangerousText(input, 80) as T;
  return allowed.includes(cleaned) ? cleaned : fallback;
}

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
