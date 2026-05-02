export type UserRole = "buyer" | "driver" | "admin";

export type BookingStatus =
  | "draft"
  | "quote_requested"
  | "quote_created"
  | "quote_expired"
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
