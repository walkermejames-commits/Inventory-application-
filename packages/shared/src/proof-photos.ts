/**
 * Proof photo ownership model:
 * - proof-upload creates storage object + photos row (canonical metadata)
 * - progress verifies an existing photos row; does not insert another
 */

export type ProofPhotoRecord = {
  id: string;
  booking_id: string;
  uploaded_by_user_id: string | null;
  photo_type: string;
  storage_path: string;
};

export type ProofPhotoVerificationResult =
  | { ok: true; photo: ProofPhotoRecord }
  | { ok: false; error: string; status: number };

/**
 * Verify that a storage_path submitted at verification time matches a
 * previously registered photo for this booking/driver/type.
 */
export function verifyRegisteredProofPhoto(params: {
  photos: readonly ProofPhotoRecord[];
  bookingId: string;
  driverId: string;
  photoType: "pickup_proof" | "delivery_proof";
  storagePath: string;
}): ProofPhotoVerificationResult {
  const path = params.storagePath?.trim();
  if (!path) {
    return { ok: false, status: 400, error: "storagePath is required" };
  }

  const match = params.photos.find(
    (photo) =>
      photo.booking_id === params.bookingId &&
      photo.uploaded_by_user_id === params.driverId &&
      photo.photo_type === params.photoType &&
      photo.storage_path === path
  );

  if (!match) {
    return {
      ok: false,
      status: 400,
      error:
        "Proof photo is not registered for this booking/driver. Upload via /api/mobile/proof-upload first.",
    };
  }

  return { ok: true, photo: match };
}

/**
 * Pure payout completion helper for tests and handlers.
 * Returns what should happen after status is already set to completed.
 */
export type PayoutCompletionStep =
  | { type: "update"; payoutId: string; status: "payout_ready" }
  | {
      type: "insert";
      bookingId: string;
      driverId: string;
      amount: number | null;
      status: "payout_ready";
    }
  | { type: "set_booking_payment_status"; status: "payout_ready" };

export function planPayoutReadySteps(params: {
  bookingId: string;
  driverId: string;
  driverPayoutAmount: number | null;
  existingPayoutId: string | null;
}): PayoutCompletionStep[] {
  const steps: PayoutCompletionStep[] = [];
  if (params.existingPayoutId) {
    steps.push({
      type: "update",
      payoutId: params.existingPayoutId,
      status: "payout_ready",
    });
  } else {
    steps.push({
      type: "insert",
      bookingId: params.bookingId,
      driverId: params.driverId,
      amount: params.driverPayoutAmount,
      status: "payout_ready",
    });
  }
  steps.push({ type: "set_booking_payment_status", status: "payout_ready" });
  return steps;
}
