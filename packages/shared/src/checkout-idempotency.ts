/**
 * Stripe Checkout session reuse / idempotency helpers (pure).
 * Tokens in success/cancel URLs remain a residual risk — prefer short-lived tokens post-pilot.
 */

export type StripeCheckoutSessionLike = {
  id: string;
  status: string | null; // open | complete | expired
  payment_status?: string | null;
  url?: string | null;
};

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
 * Same booking + amount + attempt → same key so retries do not spawn uncontrolled sessions.
 */
export function checkoutSessionIdempotencyKey(params: {
  bookingId: string;
  amountPence: number;
  attempt: number;
}): string {
  const attempt = Math.max(1, Math.floor(params.attempt));
  return `dif-checkout-${params.bookingId}-${params.amountPence}-a${attempt}`;
}

/**
 * Decide next checkout attempt number from existing payment row metadata.
 */
export function nextCheckoutAttempt(params: {
  existingCheckoutSessionId: string | null | undefined;
  existingSessionReusable: boolean;
  previousAttempt?: number | null;
}): number {
  if (params.existingSessionReusable) {
    return Math.max(1, params.previousAttempt ?? 1);
  }
  const prev = params.previousAttempt ?? (params.existingCheckoutSessionId ? 1 : 0);
  return prev + 1;
}

export type CheckoutPaymentRowPlan = {
  booking_id: string;
  amount: number;
  currency: string;
  status: "payment_pending";
  /** Set after Stripe create, or immediately when reusing */
  stripe_checkout_session_id?: string | null;
  checkout_attempt?: number;
};

/**
 * Plan local payment row before/after Stripe interaction.
 * Pre-create: persist pending row without session id (or keep previous).
 * Post-create: attach session id for reconciliation.
 */
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
