export type BookingStatus =
  | 'seller_quote_pending'
  | 'awaiting_payment'
  | 'payment_failed'
  | 'paid_awaiting_dispatch'
  | 'driver_assigned'
  | 'driver_en_route_to_pickup'
  | 'driver_arrived_at_pickup'
  | 'pickup_verified'
  | 'item_collected'
  | 'driver_en_route_to_delivery'
  | 'driver_arrived_at_delivery'
  | 'delivery_verified'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'quote_created'
  | 'quote_expired'
  | 'payment_pending'
  | 'payment_authorised'
  | 'payment_failed'
  | 'paid'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled_with_fee'
  | 'cancelled_full_refund'
  | 'payout_pending'
  | 'payout_ready'
  | 'payout_sent'
  | 'payout_failed';

export type ItemSize = 'small' | 'medium' | 'large' | 'furniture' | 'van_load' | string;

export interface Booking {
  id: string;

  status: BookingStatus;
  payment_status?: PaymentStatus | string;

  pickup_town: string;
  pickup_postcode?: string | null;
  pickup_address_line?: string | null;

  delivery_town: string;
  delivery_postcode?: string | null;
  delivery_address_line?: string | null;

  item_title: string;
  item_size: ItemSize;
  approximate_weight_kg: number;

  fragile: boolean;
  requires_two_people: boolean;
  requires_van: boolean;

  delivery_quote_amount?: number | null;
  accepted_price?: number | null;
  driver_payout_amount?: number | null;

  driver_id?: string | null;
  driver_name?: string | null;
  driver_vehicle?: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
  eta_minutes?: number | null;

  pickup_stairs_floors?: number | null;
  delivery_stairs_floors?: number | null;

  created_at: string;
  updated_at?: string | null;
}

export interface DriverSummary {
  id: string;
  full_name: string;
  phone?: string | null;
  vehicle_label?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
}

export const ACTIVE_DRIVER_STATUSES: BookingStatus[] = [
  'driver_assigned',
  'driver_en_route_to_pickup',
  'driver_arrived_at_pickup',
  'pickup_verified',
  'item_collected',
  'driver_en_route_to_delivery',
  'driver_arrived_at_delivery',
  'delivery_verified',
];

export const isPaidBooking = (booking: Pick<Booking, 'payment_status' | 'status'>) =>
  booking.payment_status === 'paid' || booking.status === 'paid_awaiting_dispatch';

export const canDriverAcceptBooking = (booking: Pick<Booking, 'status' | 'payment_status'>) =>
  booking.status === 'paid_awaiting_dispatch' && booking.payment_status === 'paid';

export const isActiveDriverJob = (booking: Pick<Booking, 'status'>) =>
  ACTIVE_DRIVER_STATUSES.includes(booking.status);

export const formatBookingMoney = (value?: number | null) => {
  if (value === null || value === undefined) return 'TBC';
  return `£${value.toFixed(2)}`;
};
