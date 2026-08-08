import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  checkoutSessionIdempotencyKey,
  nextCheckoutAttempt,
  planPaymentRowForCheckout,
  shouldReuseCheckoutSession,
} from "@door-in-four/shared";
import { supabase } from "@/src/lib/server";
import {
  canPerformBookingAction,
  extractAccessTokenFromRequest,
  resolveBookingAccess,
} from "@/src/lib/booking-access";

const getMoneyValue = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Create or reuse a Stripe Checkout Session for a booking.
 *
 * Flow (minimises orphan sessions):
 * 1. Authorise buyer token
 * 2. Upsert payments row as payment_pending (local state first)
 * 3. Reuse open Checkout Session when present
 * 4. Otherwise create session with Stripe Idempotency-Key
 * 5. Persist session id on payments row
 *
 * Token note: success/cancel URLs still carry the access token in the query string
 * so the track/checkout pages can re-auth. Prefer short-lived tokens later; avoid
 * logging full request URLs that include ?token= in production.
 */
export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const token = extractAccessTokenFromRequest(request, body);

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 401 }
      );
    }

    // Never log the raw access token
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        quotes (*),
        pickup_contacts (*),
        delivery_addresses (*)
      `
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: error?.message || "Booking not found" },
        { status: 404 }
      );
    }

    const pickup = Array.isArray(booking.pickup_contacts)
      ? booking.pickup_contacts[0]
      : booking.pickup_contacts;

    const access = resolveBookingAccess({
      providedToken: token,
      buyerTokenHash: booking.private_buyer_token_hash,
      sellerTokenHash: pickup?.secure_token_hash,
    });

    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!canPerformBookingAction(access.role, "checkout")) {
      return NextResponse.json(
        { error: "Only the buyer access token may start checkout" },
        { status: 403 }
      );
    }

    if (booking.payment_status === "paid" || booking.seller_paid_delivery === true) {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    if (booking.status !== "awaiting_payment") {
      return NextResponse.json(
        {
          error: "Quote must be confirmed before payment can begin",
        },
        { status: 400 }
      );
    }

    const quote = Array.isArray(booking.quotes) ? booking.quotes[0] : booking.quotes;
    const delivery = Array.isArray(booking.delivery_addresses)
      ? booking.delivery_addresses[0]
      : booking.delivery_addresses;

    const totalPrice =
      getMoneyValue(booking.accepted_price) ??
      getMoneyValue(booking.delivery_quote_amount) ??
      getMoneyValue(quote?.total_price);

    if (!totalPrice) {
      return NextResponse.json(
        { error: "Booking does not have a payable price yet" },
        { status: 400 }
      );
    }

    const amountPence = Math.round(totalPrice * 100);

    const { data: existingPayment } = await supabase
      .from("payments")
      .select(
        "id,status,stripe_checkout_session_id,checkout_attempt,amount"
      )
      .eq("booking_id", booking.id)
      .maybeSingle();

    // --- Reuse open session when possible ---
    if (existingPayment?.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          existingPayment.stripe_checkout_session_id
        );
        if (shouldReuseCheckoutSession(existingSession)) {
          return NextResponse.json({
            sessionId: existingSession.id,
            bookingId: booking.id,
            reused: true,
          });
        }
      } catch {
        // Session missing in Stripe — fall through to create a new one
      }
    }

    const attempt = nextCheckoutAttempt({
      existingCheckoutSessionId: existingPayment?.stripe_checkout_session_id,
      existingSessionReusable: false,
      previousAttempt: existingPayment?.checkout_attempt ?? null,
    });

    // --- Persist local payment intent BEFORE creating Stripe session ---
    const preRow = planPaymentRowForCheckout({
      bookingId: booking.id,
      amount: totalPrice,
      checkoutAttempt: attempt,
      stripeCheckoutSessionId: existingPayment?.stripe_checkout_session_id ?? null,
    });

    const { error: prePersistError } = await supabase.from("payments").upsert(
      {
        booking_id: preRow.booking_id,
        amount: preRow.amount,
        currency: preRow.currency,
        status: preRow.status,
        checkout_attempt: preRow.checkout_attempt,
      },
      { onConflict: "booking_id" }
    );

    if (prePersistError) {
      return NextResponse.json(
        {
          error: `Could not record payment state before Stripe: ${prePersistError.message}`,
        },
        { status: 500 }
      );
    }

    const sellerBaseUrl =
      process.env.NEXT_PUBLIC_SELLER_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3002";

    const pickupTown = pickup?.town || quote?.pickup_town || "pickup";
    const deliveryTown = delivery?.town || quote?.delivery_town || "delivery";
    // Token in success/cancel URLs — residual logging risk; do not log full URLs server-side
    const tokenQ = encodeURIComponent(token);
    const idempotencyKey = checkoutSessionIdempotencyKey({
      bookingId: booking.id,
      amountPence,
      attempt,
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Door in Four delivery ${booking.id.slice(0, 8)}`,
                description: `${pickupTown} → ${deliveryTown}`,
              },
              unit_amount: amountPence,
            },
            quantity: 1,
          },
        ],
        success_url: `${sellerBaseUrl}/track/${booking.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}&token=${tokenQ}`,
        cancel_url: `${sellerBaseUrl}/checkout/${booking.id}?checkout=cancelled&token=${tokenQ}`,
        metadata: {
          booking_id: booking.id,
          quote_id: booking.quote_id || "",
          source: "seller_checkout",
          checkout_attempt: String(attempt),
        },
      },
      { idempotencyKey }
    );

    const postRow = planPaymentRowForCheckout({
      bookingId: booking.id,
      amount: totalPrice,
      checkoutAttempt: attempt,
      stripeCheckoutSessionId: session.id,
    });

    const { error: postPersistError } = await supabase.from("payments").upsert(
      {
        booking_id: postRow.booking_id,
        amount: postRow.amount,
        currency: postRow.currency,
        status: postRow.status,
        checkout_attempt: postRow.checkout_attempt,
        stripe_checkout_session_id: postRow.stripe_checkout_session_id,
      },
      { onConflict: "booking_id" }
    );

    if (postPersistError) {
      // Deterministic recovery: session exists; client can retry checkout and we will reuse open session once row is fixed
      return NextResponse.json(
        {
          error: `Stripe session created but payment row update failed: ${postPersistError.message}`,
          partial: true,
          recovery: {
            sessionId: session.id,
            bookingId: booking.id,
            hint: "Retry POST /api/checkout with the same booking token; open sessions are reused once the session id is persisted.",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      bookingId: booking.id,
      reused: false,
      attempt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    // Avoid logging tokens — message only
    console.error("Seller Stripe Checkout Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
