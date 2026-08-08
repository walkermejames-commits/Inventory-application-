import { NextResponse } from "next/server";
import Stripe from "stripe";
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
 * Create Stripe Checkout session for a booking.
 * Requires buyer access token — bookingId alone is not sufficient (IDOR fix).
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

    const sellerBaseUrl =
      process.env.NEXT_PUBLIC_SELLER_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3002";

    const pickupTown = pickup?.town || quote?.pickup_town || "pickup";
    const deliveryTown = delivery?.town || quote?.delivery_town || "delivery";
    const tokenQ = encodeURIComponent(token);

    const session = await stripe.checkout.sessions.create({
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
            unit_amount: Math.round(totalPrice * 100),
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
      },
    });

    const { error: paymentError } = await supabase.from("payments").upsert(
      {
        booking_id: booking.id,
        amount: totalPrice,
        currency: "gbp",
        status: "payment_pending",
      },
      { onConflict: "booking_id" }
    );

    if (paymentError) {
      return NextResponse.json(
        { error: `Checkout session created but payment row failed: ${paymentError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      bookingId: booking.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    console.error("Seller Stripe Checkout Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
