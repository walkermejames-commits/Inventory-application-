/**
 * Client-side helpers aligned with server DRIVER_STATUS_CHAIN.
 * Prefer the shared package chain so mobile and API cannot diverge.
 */
import {
  DRIVER_STATUS_CHAIN,
  isDriverStatusTransitionAllowed,
} from "@door-in-four/shared";
import type { BookingStatus as SharedBookingStatus } from "@door-in-four/types";
import type { BookingStatus } from "../types/booking";

export { DRIVER_STATUS_CHAIN, isDriverStatusTransitionAllowed };

export type ProgressMutationInput = {
  bookingId: string;
  driverId: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  sellerCode?: string;
  buyerCode?: string;
  photoPath?: string;
};

export type ProgressValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Exact next driver status, or null if terminal / unknown. */
export function getNextDriverStatus(
  current: BookingStatus | string
): BookingStatus | null {
  const idx = DRIVER_STATUS_CHAIN.indexOf(current as SharedBookingStatus);
  if (idx === -1 || idx >= DRIVER_STATUS_CHAIN.length - 1) {
    return null;
  }
  return DRIVER_STATUS_CHAIN[idx + 1] as BookingStatus;
}

export function isVerificationStep(status: BookingStatus | string): boolean {
  return status === "pickup_verified" || status === "delivery_verified";
}

/**
 * Local preflight matching server progress route rules.
 * Does not replace server enforcement.
 */
export function validateProgressMutation(
  input: ProgressMutationInput
): ProgressValidationResult {
  if (!input.bookingId?.trim()) {
    return { ok: false, error: "bookingId is required" };
  }
  if (!input.driverId?.trim()) {
    return { ok: false, error: "driverId is required" };
  }
  if (
    !isDriverStatusTransitionAllowed(
      input.fromStatus as SharedBookingStatus,
      input.toStatus as SharedBookingStatus
    )
  ) {
    return {
      ok: false,
      error: `Invalid driver transition: ${input.fromStatus} → ${input.toStatus}`,
    };
  }

  if (input.toStatus === "pickup_verified") {
    if (!input.sellerCode?.trim()) {
      return { ok: false, error: "Seller handover code is required for pickup verification" };
    }
    if (!input.photoPath?.trim()) {
      return { ok: false, error: "Pickup proof photo is required for pickup verification" };
    }
  }

  if (input.toStatus === "delivery_verified") {
    if (!input.buyerCode?.trim()) {
      return { ok: false, error: "Buyer delivery code is required for delivery verification" };
    }
    if (!input.photoPath?.trim()) {
      return { ok: false, error: "Delivery proof photo is required for delivery verification" };
    }
  }

  return { ok: true };
}

/** Build JSON body for POST /api/drivers/jobs/[bookingId]/progress */
export function buildProgressRequestBody(input: ProgressMutationInput): Record<string, string> {
  const body: Record<string, string> = {
    driverId: input.driverId,
    toStatus: input.toStatus,
  };

  if (input.toStatus === "pickup_verified") {
    body.sellerCode = input.sellerCode?.trim() || "";
    body.photoPath = input.photoPath?.trim() || "";
  }

  if (input.toStatus === "delivery_verified") {
    body.buyerCode = input.buyerCode?.trim() || "";
    body.photoPath = input.photoPath?.trim() || "";
  }

  return body;
}

export function progressEndpointPath(bookingId: string): string {
  return `/api/drivers/jobs/${encodeURIComponent(bookingId)}/progress`;
}

export function jobFetchQuery(driverId: string, bookingId: string): string {
  const params = new URLSearchParams({
    driverId,
    bookingId,
  });
  return `/api/mobile/jobs?${params.toString()}`;
}
