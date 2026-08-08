import { describe, expect, it } from "vitest";
import {
  applyPayoutStepsInMemory,
  planPayoutReconciliation,
} from "./src/payout-reconcile";
import {
  checkoutSessionIdempotencyKey,
  nextCheckoutAttempt,
  planPaymentRowForCheckout,
  shouldReuseCheckoutSession,
} from "./src/checkout-idempotency";

describe("payout reconciliation after completed (recovery)", () => {
  it("rejects non-completed bookings", () => {
    const plan = planPayoutReconciliation({
      bookingStatus: "delivered",
      paymentStatus: "paid",
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 40,
      existingPayout: null,
    });
    expect(plan.ok).toBe(false);
  });

  it("repairs payout after simulated failure (no row, payment still paid)", () => {
    const plan = planPayoutReconciliation({
      bookingStatus: "completed",
      paymentStatus: "paid",
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 40,
      existingPayout: null,
    });
    expect(plan.ok).toBe(true);
    if (plan.ok && !plan.alreadyReady) {
      const after = applyPayoutStepsInMemory(
        { paymentStatus: "paid", payouts: [] },
        plan.steps,
        "b1"
      );
      expect(after.paymentStatus).toBe("payout_ready");
      expect(after.payouts).toHaveLength(1);
      expect(after.payouts[0].status).toBe("payout_ready");
    }
  });

  it("repeated reconciliation is a no-op when already ready (no duplicate)", () => {
    const plan1 = planPayoutReconciliation({
      bookingStatus: "completed",
      paymentStatus: "paid",
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 40,
      existingPayout: null,
    });
    expect(plan1.ok).toBe(true);
    if (!plan1.ok || plan1.alreadyReady) throw new Error("expected steps");

    const mid = applyPayoutStepsInMemory(
      { paymentStatus: "paid", payouts: [] },
      plan1.steps,
      "b1"
    );

    const plan2 = planPayoutReconciliation({
      bookingStatus: "completed",
      paymentStatus: mid.paymentStatus,
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 40,
      existingPayout: {
        id: mid.payouts[0].id,
        status: mid.payouts[0].status,
      },
    });
    expect(plan2.ok).toBe(true);
    if (plan2.ok) {
      expect(plan2.alreadyReady).toBe(true);
      expect(plan2.steps).toHaveLength(0);
    }

    // Applying empty steps must not add another payout
    const again = applyPayoutStepsInMemory(mid, [], "b1");
    expect(again.payouts).toHaveLength(1);
  });

  it("repairs booking payment_status when payout row is already ready", () => {
    const plan = planPayoutReconciliation({
      bookingStatus: "completed",
      paymentStatus: "paid",
      bookingId: "b1",
      driverId: "d1",
      driverPayoutAmount: 40,
      existingPayout: { id: "p1", status: "payout_ready" },
    });
    expect(plan.ok).toBe(true);
    if (plan.ok && !plan.alreadyReady) {
      const after = applyPayoutStepsInMemory(
        {
          paymentStatus: "paid",
          payouts: [{ id: "p1", booking_id: "b1", status: "payout_ready" }],
        },
        plan.steps,
        "b1"
      );
      expect(after.paymentStatus).toBe("payout_ready");
      expect(after.payouts).toHaveLength(1);
    }
  });
});

describe("checkout session idempotency", () => {
  it("reuses open sessions only", () => {
    expect(shouldReuseCheckoutSession({ id: "cs_1", status: "open" })).toBe(true);
    expect(shouldReuseCheckoutSession({ id: "cs_1", status: "complete" })).toBe(false);
    expect(shouldReuseCheckoutSession({ id: "cs_1", status: "expired" })).toBe(false);
    expect(shouldReuseCheckoutSession(null)).toBe(false);
  });

  it("builds stable idempotency keys per booking/amount/attempt", () => {
    const a = checkoutSessionIdempotencyKey({
      bookingId: "b1",
      amountPence: 5000,
      attempt: 1,
    });
    const b = checkoutSessionIdempotencyKey({
      bookingId: "b1",
      amountPence: 5000,
      attempt: 1,
    });
    const c = checkoutSessionIdempotencyKey({
      bookingId: "b1",
      amountPence: 5000,
      attempt: 2,
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("increments attempt when prior session cannot be reused", () => {
    expect(
      nextCheckoutAttempt({
        existingCheckoutSessionId: null,
        existingSessionReusable: false,
      })
    ).toBe(1);

    expect(
      nextCheckoutAttempt({
        existingCheckoutSessionId: "cs_old",
        existingSessionReusable: false,
        previousAttempt: 1,
      })
    ).toBe(2);

    expect(
      nextCheckoutAttempt({
        existingCheckoutSessionId: "cs_open",
        existingSessionReusable: true,
        previousAttempt: 3,
      })
    ).toBe(3);
  });

  it("plans payment row for pre/post Stripe persist", () => {
    const pre = planPaymentRowForCheckout({
      bookingId: "b1",
      amount: 50,
      checkoutAttempt: 1,
    });
    expect(pre.status).toBe("payment_pending");
    expect(pre.stripe_checkout_session_id).toBeNull();

    const post = planPaymentRowForCheckout({
      bookingId: "b1",
      amount: 50,
      checkoutAttempt: 1,
      stripeCheckoutSessionId: "cs_test",
    });
    expect(post.stripe_checkout_session_id).toBe("cs_test");
  });
});
