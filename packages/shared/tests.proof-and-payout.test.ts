import { describe, expect, it } from "vitest";
import {
  planPayoutReadySteps,
  verifyRegisteredProofPhoto,
  type ProofPhotoRecord,
} from "./src/proof-photos";

const registered: ProofPhotoRecord = {
  id: "photo-1",
  booking_id: "booking-1",
  uploaded_by_user_id: "driver-1",
  photo_type: "pickup_proof",
  storage_path: "proofs/booking-1/pickup_proof-1.jpg",
};

describe("proof photo registration (no duplicate insert model)", () => {
  it("accepts a photo registered for this booking/driver/type/path", () => {
    const result = verifyRegisteredProofPhoto({
      photos: [registered],
      bookingId: "booking-1",
      driverId: "driver-1",
      photoType: "pickup_proof",
      storagePath: "proofs/booking-1/pickup_proof-1.jpg",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an arbitrary storage path never uploaded for this booking", () => {
    const result = verifyRegisteredProofPhoto({
      photos: [registered],
      bookingId: "booking-1",
      driverId: "driver-1",
      photoType: "pickup_proof",
      storagePath: "proofs/other-booking/pickup_proof-1.jpg",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects wrong driver or wrong photo type", () => {
    expect(
      verifyRegisteredProofPhoto({
        photos: [registered],
        bookingId: "booking-1",
        driverId: "driver-2",
        photoType: "pickup_proof",
        storagePath: registered.storage_path,
      }).ok
    ).toBe(false);

    expect(
      verifyRegisteredProofPhoto({
        photos: [registered],
        bookingId: "booking-1",
        driverId: "driver-1",
        photoType: "delivery_proof",
        storagePath: registered.storage_path,
      }).ok
    ).toBe(false);
  });
});

describe("payout completion planning", () => {
  it("plans update when payout row exists", () => {
    const steps = planPayoutReadySteps({
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 50,
      existingPayoutId: "payout-1",
    });
    expect(steps).toEqual([
      { type: "update", payoutId: "payout-1", status: "payout_ready" },
      { type: "set_booking_payment_status", status: "payout_ready" },
    ]);
  });

  it("plans insert when payout row is missing", () => {
    const steps = planPayoutReadySteps({
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 50,
      existingPayoutId: null,
    });
    expect(steps[0]).toMatchObject({
      type: "insert",
      bookingId: "b1",
      driverId: "d1",
      status: "payout_ready",
    });
    expect(steps[1]).toEqual({
      type: "set_booking_payment_status",
      status: "payout_ready",
    });
  });

  it("documents that any failed step must surface as partial error after completed", () => {
    // Contract: handlers must not ignore step errors after status=completed.
    // This test locks the ordered steps that must each be checked.
    const steps = planPayoutReadySteps({
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 10,
      existingPayoutId: null,
    });
    expect(steps.length).toBe(2);
    expect(steps.map((s) => s.type)).toEqual([
      "insert",
      "set_booking_payment_status",
    ]);
  });
});
