/**
 * Stripe Checkout session reuse / idempotency helpers (pure).
 *
 * Critical recovery rule:
 * If Stripe session create succeeded but stripe_checkout_session_id was not
 * persisted, retry MUST use the SAME attempt (and thus Idempotency-Key) so
 * Stripe returns the same session — do not bump attempt merely because session
 * id is null.
 *
 * Advance attempt only when a prior session is known terminal (expired /
 * complete / missing in Stripe) or amount changed.
 */

export type StripeCheckoutSessionLike = {
  id: string;
  status: string | null; // open | complete | expired
  payment_status?: string | null;
  url?: string | null;
};

export type ExistingSessionDisposition =
  | "none"
  | "open"
  | "complete"
  | "expired"
  | "missing"
  | "unknown";

/**
 * Reuse an existing Checkout Session when it is still open for the same unpaid booking.
 */
export function shouldReuseCheckoutSession(
  session: StripeCheckoutSessionLike | null | undefined
): boolean {
  if (!session?.id) return false;
  return session.status === "open";
}

/**
 * Deterministic Stripe Idempotency-Key for session creation.
 * Same booking + amount + attempt → same key so retries recover the same session.
 */
export function checkoutSessionIdempotencyKey(params: {
  bookingId: string;
  amountPence: number;
  attempt: number;
}): string {
  const attempt = Math.max(1, Math.floor(params.attempt));
  return `dif-checkout-${params.bookingId}-${params.amountPence}-a${attempt}`;
}

export type CheckoutAttemptDecision = {
  attempt: number;
  /**
   * - first: no prior attempt reserved
   * - same_attempt_recovery: attempt already reserved, session id missing (post-Stripe DB fail)
   * - reuse_open_session: stored session is open (caller should not create)
   * - advance_after_terminal_session: prior session expired/complete/missing → new attempt
   * - advance_after_amount_change: price changed → new attempt
   */
  reason:
    | "first"
    | "same_attempt_recovery"
    | "reuse_open_session"
    | "advance_after_terminal_session"
    | "advance_after_amount_change";
  shouldCreateSession: boolean;
};

/**
 * Resolve which checkout attempt number to use for Stripe Idempotency-Key.
 *
 * Does NOT increment attempt when session id is absent after a partial success
 * (attempt already set, no stored session id).
 */
export function resolveCheckoutAttempt(params: {
  previousAttempt: number | null | undefined;
  existingCheckoutSessionId: string | null | undefined;
  /**
   * Disposition of the stored session after Stripe retrieve (if any).
   * Pass "none" when no session id is stored.
   */
  sessionDisposition: ExistingSessionDisposition;
  /** True when payable amount differs from the amount on the payment row */
  amountChanged?: boolean;
}): CheckoutAttemptDecision {
  const prev = Math.max(0, Math.floor(Number(params.previousAttempt) || 0));
  const hasSessionId = Boolean(
    params.existingCheckoutSessionId && String(params.existingCheckoutSessionId).trim()
  );

  if (params.amountChanged && (prev >= 1 || hasSessionId)) {
    return {
      attempt: Math.max(1, prev) + 1,
      reason: "advance_after_amount_change",
      shouldCreateSession: true,
    };
  }

  if (params.sessionDisposition === "open" && hasSessionId) {
    return {
      attempt: Math.max(1, prev || 1),
      reason: "reuse_open_session",
      shouldCreateSession: false,
    };
  }

  // Prior session known dead → new attempt (new idempotency key intentionally)
  if (
    hasSessionId &&
    (params.sessionDisposition === "complete" ||
      params.sessionDisposition === "expired" ||
      params.sessionDisposition === "missing")
  ) {
    return {
      attempt: Math.max(1, prev) + 1,
      reason: "advance_after_terminal_session",
      shouldCreateSession: true,
    };
  }

  // Partial failure recovery: attempt already reserved, session id never written
  // Keep the same attempt so Stripe Idempotency-Key returns the same session.
  if (prev >= 1 && !hasSessionId) {
    return {
      attempt: prev,
      reason: "same_attempt_recovery",
      shouldCreateSession: true,
    };
  }

  // Unknown disposition with stored id — do not invent a new attempt; try create with current
  if (hasSessionId && params.sessionDisposition === "unknown") {
    return {
      attempt: Math.max(1, prev || 1),
      reason: "same_attempt_recovery",
      shouldCreateSession: true,
    };
  }

  return {
    attempt: 1,
    reason: "first",
    shouldCreateSession: true,
  };
}

/**
 * @deprecated Prefer resolveCheckoutAttempt — kept for call-site migration.
 * Note: this old helper incorrectly advanced attempt when session id was null.
 */
export function nextCheckoutAttempt(params: {
  existingCheckoutSessionId: string | null | undefined;
  existingSessionReusable: boolean;
  previousAttempt?: number | null;
}): number {
  const decision = resolveCheckoutAttempt({
    previousAttempt: params.previousAttempt,
    existingCheckoutSessionId: params.existingCheckoutSessionId,
    sessionDisposition: params.existingSessionReusable
      ? "open"
      : params.existingCheckoutSessionId
        ? "expired"
        : params.previousAttempt && params.previousAttempt >= 1
          ? "none"
          : "none",
  });
  // Map old API: when not reusable and had session id, old code advanced.
  // When not reusable and no session id but had previousAttempt, NEW correct behaviour is keep.
  if (
    !params.existingSessionReusable &&
    !params.existingCheckoutSessionId &&
    (params.previousAttempt ?? 0) >= 1
  ) {
    return Math.max(1, Math.floor(params.previousAttempt ?? 1));
  }
  return decision.attempt;
}

/**
 * Simulate partial-failure recovery path for tests:
 * pre-persist attempt N → Stripe create with key N → DB session-id write fails
 * → retry must produce the same idempotency key.
 */
export function simulatePartialCheckoutRecoveryKeys(params: {
  bookingId: string;
  amountPence: number;
}): {
  firstKey: string;
  retryKey: string;
  attemptOnRetry: number;
  keysMatch: boolean;
} {
  // First request: no prior state
  const first = resolveCheckoutAttempt({
    previousAttempt: 0,
    existingCheckoutSessionId: null,
    sessionDisposition: "none",
  });
  const firstKey = checkoutSessionIdempotencyKey({
    bookingId: params.bookingId,
    amountPence: params.amountPence,
    attempt: first.attempt,
  });

  // After partial failure: attempt stored, session id null
  const retry = resolveCheckoutAttempt({
    previousAttempt: first.attempt,
    existingCheckoutSessionId: null,
    sessionDisposition: "none",
  });
  const retryKey = checkoutSessionIdempotencyKey({
    bookingId: params.bookingId,
    amountPence: params.amountPence,
    attempt: retry.attempt,
  });

  return {
    firstKey,
    retryKey,
    attemptOnRetry: retry.attempt,
    keysMatch: firstKey === retryKey,
  };
}

export type CheckoutPaymentRowPlan = {
  booking_id: string;
  amount: number;
  currency: string;
  status: "payment_pending";
  stripe_checkout_session_id?: string | null;
  checkout_attempt?: number;
};

export function planPaymentRowForCheckout(params: {
  bookingId: string;
  amount: number;
  currency?: string;
  checkoutAttempt: number;
  stripeCheckoutSessionId?: string | null;
}): CheckoutPaymentRowPlan {
  return {
    booking_id: params.bookingId,
    amount: params.amount,
    currency: params.currency || "gbp",
    status: "payment_pending",
    checkout_attempt: params.checkoutAttempt,
    stripe_checkout_session_id: params.stripeCheckoutSessionId ?? null,
  };
}
