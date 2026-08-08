/** Shared domain types and money constants for Door in Four. */

/** Driver share of delivery subtotal / accepted price. Single source of truth. */
export const DRIVER_PAYOUT_RATIO = 0.75 as const;

/** Platform service fee as a fraction of subtotal (pricing engine). */
export const PLATFORM_SERVICE_FEE_RATIO = 0.1 as const;

export type UserRole = "buyer" | "driver" | "admin";

/**
 * Canonical booking lifecycle.
 * `seller_quote_pending` is the buyer-led / seller-link equivalent of an open quote
 * before the buyer accepts and pays (maps forward into awaiting_payment).
 */
export type BookingStatus =
  | "draft"
  | "quote_requested"
  | "quote_created"
  | "quote_expired"
  | "seller_quote_pending"
  | "awaiting_payment"
  | "payment_failed"
  | "paid_awaiting_dispatch"
  | "driver_assigned"
  | "driver_en_route_to_pickup"
  | "driver_arrived_at_pickup"
  | "pickup_verified"
  | "item_collected"
  | "driver_en_route_to_delivery"
  | "driver_arrived_at_delivery"
  | "delivery_verified"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export type PaymentStatus =
  | "quote_created"
  | "quote_expired"
  | "payment_pending"
  | "payment_authorised"
  | "payment_failed"
  | "paid"
  | "refunded"
  | "partially_refunded"
  | "cancelled_with_fee"
  | "cancelled_full_refund"
  | "payout_pending"
  | "payout_ready"
  | "payout_sent"
  | "payout_failed";

export type ItemSize = "small" | "medium" | "large" | "furniture" | "van_load";
export type Urgency = "flexible" | "scheduled" | "tomorrow" | "same_day" | "asap";

/** How the booking was originated. */
export type SellerFlowType = "buyer_led" | "seller_link" | "admin_quote";

export interface BookingItemInput {
  title: string;
  description: string;
  category: string;
  size: ItemSize;
  approximateWeightKg: number;
  quantity: number;
  fragile: boolean;
  pickupStairsFloors: number;
  deliveryStairsFloors: number;
  requiresTwoPeople: boolean;
  requiresVan: boolean;
  disassemblyRequired: boolean;
}

export function calculateDriverPayoutAmount(subtotal: number, adminOverride?: number): number {
  if (typeof adminOverride === "number" && Number.isFinite(adminOverride)) {
    return Math.round(adminOverride * 100) / 100;
  }
  return Math.round(subtotal * DRIVER_PAYOUT_RATIO * 100) / 100;
}
