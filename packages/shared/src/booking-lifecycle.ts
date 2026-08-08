import type { BookingStatus, PaymentStatus } from "@door-in-four/types";
import { calculateDriverPayoutAmount, DRIVER_PAYOUT_RATIO } from "@door-in-four/types";

export { DRIVER_PAYOUT_RATIO, calculateDriverPayoutAmount };

/**
 * Happy-path ordered statuses for buyer-led and admin quote flows.
 * Terminal exception states (cancelled / disputed / refunded) are handled separately.
 */
export const ORDERED_BOOKING_STATUSES: BookingStatus[] = [
  "draft",
  "quote_requested",
  "quote_created",
  "seller_quote_pending",
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
  "completed",
];

/**
 * Strict sequential chain a driver must walk. No skips.
 * Pickup verification and delivery verification are mandatory steps.
 */
export const DRIVER_STATUS_CHAIN: BookingStatus[] = [
  "driver_assigned",
  "driver_en_route_to_pickup",
  "driver_arrived_at_pickup",
  "pickup_verified",
  "item_collected",
  "driver_en_route_to_delivery",
  "driver_arrived_at_delivery",
  "delivery_verified",
  "delivered",
  "completed",
];

const TERMINAL: BookingStatus[] = ["cancelled", "disputed", "refunded"];

/**
 * Admin / ops transitions: forward progress (including deliberate skips) and
 * privileged moves into terminal states. Used only by authenticated admin routes.
 */
export function isAdminStatusTransitionAllowed(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  if (TERMINAL.includes(from)) return false;
  if (TERMINAL.includes(to)) return true;
  // quote_expired is a soft terminal for open quotes
  if (from === "quote_expired") return false;
  if (to === "quote_expired") {
    return ["draft", "quote_requested", "quote_created", "seller_quote_pending"].includes(
      from
    );
  }
  // payment_failed can return to awaiting_payment for retry
  if (to === "payment_failed") {
    return from === "awaiting_payment";
  }
  if (from === "payment_failed" && to === "awaiting_payment") return true;

  const fromIdx = ORDERED_BOOKING_STATUSES.indexOf(from);
  const toIdx = ORDERED_BOOKING_STATUSES.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  // Allow stay or forward (including skips for ops override)
  return toIdx >= fromIdx;
}

/**
 * Driver-controlled transitions: exact next step only.
 * A driver can never jump to completed (or any later stage) without
 * pickup_verified and delivery_verified in sequence.
 */
export function isDriverStatusTransitionAllowed(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  const fromIdx = DRIVER_STATUS_CHAIN.indexOf(from);
  const toIdx = DRIVER_STATUS_CHAIN.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  // Strict adjacency — no skips, no reverse, no stay
  return toIdx === fromIdx + 1;
}

/**
 * @deprecated Prefer isAdminStatusTransitionAllowed or isDriverStatusTransitionAllowed.
 * Kept as the admin/ops rule for backward compatibility.
 */
export function isStatusTransitionAllowed(from: BookingStatus, to: BookingStatus): boolean {
  return isAdminStatusTransitionAllowed(from, to);
}

/** True if the driver lifecycle has completed required verification stages. */
export function hasCompletedRequiredDriverVerifications(
  reachedStatuses: readonly BookingStatus[]
): boolean {
  return (
    reachedStatuses.includes("pickup_verified") &&
    reachedStatuses.includes("delivery_verified") &&
    reachedStatuses.includes("completed")
  );
}

/**
 * Simulate applying a sequence of driver transitions; returns false if any step illegal.
 * Used by tests and as a pure model of the progress endpoint policy.
 */
export function canDriverWalkPath(
  start: BookingStatus,
  steps: readonly BookingStatus[]
): boolean {
  let current = start;
  for (const next of steps) {
    if (!isDriverStatusTransitionAllowed(current, next)) return false;
    current = next;
  }
  return true;
}

export function isPaymentStatusPaid(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "paid";
}

export function canDispatch(paymentStatus: string, bookingStatus: string): boolean {
  return isPaymentStatusPaid(paymentStatus) && bookingStatus === "paid_awaiting_dispatch";
}

export function canPayQuote(expiresAtIso: string, now = new Date()): boolean {
  return new Date(expiresAtIso).getTime() > now.getTime();
}

export function canSetPayoutReady(bookingStatus: string): boolean {
  return bookingStatus === "completed";
}

/**
 * Payout readiness is only valid when the booking is completed via a legal path.
 * Drivers cannot mark completed without walking the verification chain, so a skipped
 * lifecycle never reaches this state through the driver progress endpoint.
 */
export function canDriverReachPayoutReady(
  from: BookingStatus,
  attemptedTo: BookingStatus
): boolean {
  if (!isDriverStatusTransitionAllowed(from, attemptedTo)) return false;
  return attemptedTo === "completed" && canSetPayoutReady(attemptedTo);
}

export function isQuoteExpired(expiresAtIso: string, now = new Date()): boolean {
  return new Date(expiresAtIso).getTime() <= now.getTime();
}

export function shouldProcessWebhook(
  existingStatus: string | null | undefined,
  targetStatus: string
): boolean {
  return existingStatus !== targetStatus;
}

/**
 * Canonical next status after Stripe marks a booking paid.
 */
export function statusAfterPaymentConfirmed(): {
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
} {
  return {
    bookingStatus: "paid_awaiting_dispatch",
    paymentStatus: "paid",
  };
}

/**
 * Simulate the pilot happy path for tests (pure, no I/O).
 * Uses admin-allowed transitions (skips OK) for high-level commercial path.
 */
export type HappyPathStep = {
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  label: string;
};

export function buildHappyPathSteps(
  origin: "buyer_led" | "admin_quote" = "buyer_led"
): HappyPathStep[] {
  const open: HappyPathStep =
    origin === "buyer_led"
      ? {
          bookingStatus: "seller_quote_pending",
          paymentStatus: "quote_created",
          label: "buyer_led_quote_open",
        }
      : {
          bookingStatus: "quote_created",
          paymentStatus: "quote_created",
          label: "admin_quote_open",
        };

  return [
    open,
    {
      bookingStatus: "awaiting_payment",
      paymentStatus: "payment_pending",
      label: "quote_accepted",
    },
    {
      bookingStatus: "paid_awaiting_dispatch",
      paymentStatus: "paid",
      label: "payment_confirmed",
    },
    {
      bookingStatus: "driver_assigned",
      paymentStatus: "paid",
      label: "driver_assigned",
    },
    {
      bookingStatus: "driver_en_route_to_pickup",
      paymentStatus: "paid",
      label: "en_route_pickup",
    },
    {
      bookingStatus: "item_collected",
      paymentStatus: "paid",
      label: "item_collected",
    },
    {
      bookingStatus: "driver_en_route_to_delivery",
      paymentStatus: "paid",
      label: "en_route_delivery",
    },
    {
      bookingStatus: "delivered",
      paymentStatus: "paid",
      label: "delivered",
    },
    {
      bookingStatus: "completed",
      paymentStatus: "payout_ready",
      label: "completed_payout_ready",
    },
  ];
}

/** Full strict driver walk from assignment through completion. */
export function buildStrictDriverProgressPath(): BookingStatus[] {
  return [...DRIVER_STATUS_CHAIN];
}

export function assertHappyPathTransitions(steps: HappyPathStep[]): void {
  for (let i = 1; i < steps.length; i += 1) {
    const from = steps[i - 1].bookingStatus;
    const to = steps[i].bookingStatus;
    // High-level commercial path uses admin rules (ops may compress intermediate driver steps in fixtures)
    if (!isAdminStatusTransitionAllowed(from, to)) {
      throw new Error(`Illegal transition ${from} → ${to} at step ${steps[i].label}`);
    }
  }
}

export function assertStrictDriverPath(statuses: readonly BookingStatus[]): void {
  for (let i = 1; i < statuses.length; i += 1) {
    if (!isDriverStatusTransitionAllowed(statuses[i - 1], statuses[i])) {
      throw new Error(
        `Illegal driver transition ${statuses[i - 1]} → ${statuses[i]}`
      );
    }
  }
}
