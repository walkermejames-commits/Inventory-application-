import { planPayoutReadySteps, type PayoutCompletionStep } from "./proof-photos";

export type PayoutReconcileInput = {
  bookingStatus: string;
  paymentStatus: string | null | undefined;
  bookingId: string;
  driverId: string | null | undefined;
  driverPayoutAmount: number | null | undefined;
  existingPayout: { id: string; status: string | null } | null;
};

export type PayoutReconcilePlan =
  | {
      ok: true;
      alreadyReady: true;
      steps: [];
    }
  | {
      ok: true;
      alreadyReady: false;
      steps: PayoutCompletionStep[];
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

/**
 * Idempotent payout-readiness plan for completed bookings only.
 * Drivers never call this path for arbitrary statuses — admin/internal reconcile only.
 */
export function planPayoutReconciliation(input: PayoutReconcileInput): PayoutReconcilePlan {
  if (input.bookingStatus !== "completed") {
    return {
      ok: false,
      status: 400,
      error: "Payout reconciliation is only allowed for completed bookings",
    };
  }

  if (!input.driverId) {
    return {
      ok: false,
      status: 400,
      error: "Completed booking has no driver assigned; cannot mark payout ready",
    };
  }

  const payoutReady =
    input.paymentStatus === "payout_ready" ||
    input.paymentStatus === "payout_sent" ||
    input.existingPayout?.status === "payout_ready" ||
    input.existingPayout?.status === "payout_sent";

  const bookingPaymentReady =
    input.paymentStatus === "payout_ready" || input.paymentStatus === "payout_sent";

  const rowReady =
    input.existingPayout?.status === "payout_ready" ||
    input.existingPayout?.status === "payout_sent";

  // Fully reconciled
  if (bookingPaymentReady && rowReady) {
    return { ok: true, alreadyReady: true, steps: [] };
  }

  // Need to repair either payout row and/or booking.payment_status
  // Prefer update when a row exists (even if status wrong); insert only when absent.
  // If row is already ready but booking.payment_status is not, only set payment_status.
  if (rowReady && !bookingPaymentReady) {
    return {
      ok: true,
      alreadyReady: false,
      steps: [{ type: "set_booking_payment_status", status: "payout_ready" }],
    };
  }

  const steps = planPayoutReadySteps({
    bookingId: input.bookingId,
    driverId: input.driverId,
    driverPayoutAmount:
      typeof input.driverPayoutAmount === "number" ? input.driverPayoutAmount : null,
    existingPayoutId: input.existingPayout?.id ?? null,
  });

  // If payout already ready but plan still wants update, collapse to payment_status only
  if (rowReady) {
    return {
      ok: true,
      alreadyReady: false,
      steps: steps.filter((s) => s.type === "set_booking_payment_status"),
    };
  }

  // Avoid no-op if somehow empty
  if (steps.length === 0 && payoutReady) {
    return { ok: true, alreadyReady: true, steps: [] };
  }

  return { ok: true, alreadyReady: false, steps };
}

/** Simulate applying steps against an in-memory store (unit tests). */
export function applyPayoutStepsInMemory(
  state: {
    paymentStatus: string;
    payouts: Array<{ id: string; booking_id: string; status: string; amount?: number | null }>;
  },
  steps: PayoutCompletionStep[],
  bookingId: string
): typeof state {
  const next = {
    paymentStatus: state.paymentStatus,
    payouts: state.payouts.map((p) => ({ ...p })),
  };

  for (const step of steps) {
    if (step.type === "update") {
      const row = next.payouts.find((p) => p.id === step.payoutId);
      if (!row) throw new Error("payout update target missing");
      row.status = step.status;
    }
    if (step.type === "insert") {
      if (next.payouts.some((p) => p.booking_id === step.bookingId)) {
        throw new Error("duplicate payout insert blocked");
      }
      next.payouts.push({
        id: `payout-${next.payouts.length + 1}`,
        booking_id: step.bookingId,
        status: step.status,
        amount: step.amount,
      });
    }
    if (step.type === "set_booking_payment_status") {
      next.paymentStatus = step.status;
    }
  }

  // Idempotent re-plan should be empty after success
  void bookingId;
  return next;
}
