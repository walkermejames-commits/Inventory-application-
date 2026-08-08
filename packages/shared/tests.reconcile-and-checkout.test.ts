import { describe, expect, it } from "vitest";
import {
  applyPayoutStepsInMemory,
  planPayoutReconciliation,
} from "./src/payout-reconcile";
import {
  checkoutSessionIdempotencyKey,
  nextCheckoutAttempt,
  planPaymentRowForCheckout,
  resolveCheckoutAttempt,
  shouldReuseCheckoutSession,
  simulatePartialCheckoutRecoveryKeys,
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

  it("partial failure: Stripe create success then DB session-id write fails → retry SAME key", () => {
    // 1) pre-persist succeeds with attempt 1, no session id yet
    // 2) Stripe create succeeds with key ...-a1
    // 3) post-persist of session id fails
    // 4) client retries — must NOT bump attempt
    const sim = simulatePartialCheckoutRecoveryKeys({
      bookingId: "booking-uuid-1",
      amountPence: 9200,
    });

    expect(sim.attemptOnRetry).toBe(1);
    expect(sim.keysMatch).toBe(true);
    expect(sim.firstKey).toBe(sim.retryKey);
    expect(sim.firstKey).toBe(
      "dif-checkout-booking-uuid-1-9200-a1"
    );

    // Explicit state machine check for the recovery shape
    const afterPartial = resolveCheckoutAttempt({
      previousAttempt: 1,
      existingCheckoutSessionId: null,
      sessionDisposition: "none",
    });
    expect(afterPartial.reason).toBe("same_attempt_recovery");
    expect(afterPartial.attempt).toBe(1);
    expect(afterPartial.shouldCreateSession).toBe(true);

    // Old buggy helper used to return 2 here — document the fix via nextCheckoutAttempt
    expect(
      nextCheckoutAttempt({
        existingCheckoutSessionId: null,
        existingSessionReusable: false,
        previousAttempt: 1,
      })
    ).toBe(1);
  });

  it("does not create a second logical session attempt on recovery (no key divergence)", () => {
    const bookingId = "b-recovery";
    const amountPence = 1500;

    const keys = new Set<string>();
    // First create
    let attempt = resolveCheckoutAttempt({
      previousAttempt: 0,
      existingCheckoutSessionId: null,
      sessionDisposition: "none",
    }).attempt;
    keys.add(checkoutSessionIdempotencyKey({ bookingId, amountPence, attempt }));

    // Three retries with attempt reserved, session id still null (DB write never landed)
    for (let i = 0; i < 3; i += 1) {
      attempt = resolveCheckoutAttempt({
        previousAttempt: attempt,
        existingCheckoutSessionId: null,
        sessionDisposition: "none",
      }).attempt;
      keys.add(checkoutSessionIdempotencyKey({ bookingId, amountPence, attempt }));
    }

    expect(keys.size).toBe(1);
  });

  it("advances attempt only when prior session is terminal (expired/complete/missing)", () => {
    expect(
      resolveCheckoutAttempt({
        previousAttempt: 1,
        existingCheckoutSessionId: "cs_old",
        sessionDisposition: "expired",
      })
    ).toMatchObject({ attempt: 2, reason: "advance_after_terminal_session" });

    expect(
      resolveCheckoutAttempt({
        previousAttempt: 1,
        existingCheckoutSessionId: "cs_done",
        sessionDisposition: "complete",
      })
    ).toMatchObject({ attempt: 2, reason: "advance_after_terminal_session" });

    expect(
      resolveCheckoutAttempt({
        previousAttempt: 2,
        existingCheckoutSessionId: "cs_gone",
        sessionDisposition: "missing",
      })
    ).toMatchObject({ attempt: 3, reason: "advance_after_terminal_session" });
  });

  it("keeps open-session reuse without creating", () => {
    const d = resolveCheckoutAttempt({
      previousAttempt: 2,
      existingCheckoutSessionId: "cs_open",
      sessionDisposition: "open",
    });
    expect(d.shouldCreateSession).toBe(false);
    expect(d.reason).toBe("reuse_open_session");
    expect(d.attempt).toBe(2);
  });

  it("advances attempt when amount changes", () => {
    const d = resolveCheckoutAttempt({
      previousAttempt: 1,
      existingCheckoutSessionId: "cs_open",
      sessionDisposition: "open",
      amountChanged: true,
    });
    expect(d.attempt).toBe(2);
    expect(d.reason).toBe("advance_after_amount_change");
    expect(d.shouldCreateSession).toBe(true);
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
    // Same attempt after partial failure recovery
    expect(post.checkout_attempt).toBe(1);
  });
});
