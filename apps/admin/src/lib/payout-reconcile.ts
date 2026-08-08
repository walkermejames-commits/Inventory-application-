import { planPayoutReconciliation, type PayoutCompletionStep } from "@door-in-four/shared";
import { supabase } from "@/lib/server";

export type ReconcileResult =
  | {
      ok: true;
      alreadyReady: boolean;
      bookingId: string;
      paymentStatus: string;
      payoutId: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      partial?: boolean;
      bookingId?: string;
    };

async function applySteps(
  bookingId: string,
  steps: PayoutCompletionStep[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const step of steps) {
    if (step.type === "update") {
      const { error } = await supabase
        .from("payouts")
        .update({ status: step.status })
        .eq("id", step.payoutId);
      if (error) return { ok: false, error: `payout update failed: ${error.message}` };
    }

    if (step.type === "insert") {
      // Upsert on booking_id unique index — safe under concurrent reconcile
      const { error } = await supabase.from("payouts").upsert(
        {
          booking_id: step.bookingId,
          driver_id: step.driverId,
          stripe_connect_account_id: null,
          amount: step.amount,
          currency: "gbp",
          status: step.status,
        },
        { onConflict: "booking_id" }
      );
      if (error) return { ok: false, error: `payout insert/upsert failed: ${error.message}` };

      // Ensure status is payout_ready even if row existed with different status
      const { error: forceError } = await supabase
        .from("payouts")
        .update({ status: "payout_ready" })
        .eq("booking_id", step.bookingId);
      if (forceError) {
        return { ok: false, error: `payout status force failed: ${forceError.message}` };
      }
    }

    if (step.type === "set_booking_payment_status") {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: step.status })
        .eq("id", bookingId);
      if (error) {
        return { ok: false, error: `booking payment_status update failed: ${error.message}` };
      }
    }
  }
  return { ok: true };
}

/**
 * Idempotent repair for completed bookings with incomplete payout readiness.
 * Safe to call repeatedly. Does not change booking.status.
 */
export async function reconcilePayoutReadyForBooking(
  bookingId: string
): Promise<ReconcileResult> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,payment_status,driver_id,driver_payout_amount")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return {
      ok: false,
      status: 404,
      error: bookingError?.message || "Booking not found",
    };
  }

  const { data: existingPayout, error: payoutLookupError } = await supabase
    .from("payouts")
    .select("id,status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (payoutLookupError) {
    return {
      ok: false,
      status: 500,
      error: `Payout lookup failed: ${payoutLookupError.message}`,
      bookingId,
    };
  }

  const plan = planPayoutReconciliation({
    bookingStatus: booking.status,
    paymentStatus: booking.payment_status,
    bookingId: booking.id,
    driverId: booking.driver_id,
    driverPayoutAmount: booking.driver_payout_amount,
    existingPayout: existingPayout
      ? { id: existingPayout.id, status: existingPayout.status }
      : null,
  });

  if (plan.ok === false) {
    return { ok: false, status: plan.status, error: plan.error, bookingId };
  }

  if (plan.alreadyReady) {
    return {
      ok: true,
      alreadyReady: true,
      bookingId: booking.id,
      paymentStatus: booking.payment_status || "payout_ready",
      payoutId: existingPayout?.id ?? null,
    };
  }

  const applied = await applySteps(booking.id, plan.steps);
  if (applied.ok === false) {
    return {
      ok: false,
      status: 500,
      error: applied.error,
      partial: true,
      bookingId: booking.id,
    };
  }

  const { data: payoutAfter } = await supabase
    .from("payouts")
    .select("id,status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const { data: bookingAfter } = await supabase
    .from("bookings")
    .select("payment_status")
    .eq("id", bookingId)
    .single();

  return {
    ok: true,
    alreadyReady: false,
    bookingId: booking.id,
    paymentStatus: bookingAfter?.payment_status || "payout_ready",
    payoutId: payoutAfter?.id ?? null,
  };
}
