import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const getMoneyValue = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const { bookingId } = await request.json();

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        quotes (*),
        pickup_contacts (*),
        delivery_addresses (*)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: error?.message || 'Booking not found' }, { status: 404 });
    }

    if (booking.payment_status === 'paid' || booking.seller_paid_delivery === true) {
      return NextResponse.json({ error: 'This booking has already been paid' }, { status: 400 });
    }

    const quote = Array.isArray(booking.quotes) ? booking.quotes[0] : booking.quotes;
    const pickup = Array.isArray(booking.pickup_contacts) ? booking.pickup_contacts[0] : booking.pickup_contacts;
    const delivery = Array.isArray(booking.delivery_addresses) ? booking.delivery_addresses[0] : booking.delivery_addresses;

    const totalPrice =
      getMoneyValue(booking.accepted_price) ??
      getMoneyValue(booking.delivery_quote_amount) ??
      getMoneyValue(quote?.total_price);

    if (!totalPrice) {
      return NextResponse.json({ error: 'Booking does not have a payable price yet' }, { status: 400 });
    }

    const sellerBaseUrl =
      process.env.NEXT_PUBLIC_SELLER_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3002';

    const pickupTown = pickup?.town || quote?.pickup_town || 'pickup';
    const deliveryTown = delivery?.town || quote?.delivery_town || 'delivery';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Door in Four delivery ${booking.id.slice(0, 8)}`,
              description: `${pickupTown} → ${deliveryTown}`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${sellerBaseUrl}/track/${booking.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${sellerBaseUrl}/checkout/${booking.id}?checkout=cancelled`,
      metadata: {
        booking_id: booking.id,
        quote_id: booking.quote_id || '',
        source: 'seller_checkout',
      },
    });

    await supabase
      .from('payments')
      .upsert(
        {
          booking_id: booking.id,
          amount: totalPrice,
          currency: 'gbp',
          status: 'payment_pending',
        },
        { onConflict: 'booking_id' }
      );

    return NextResponse.json({
      sessionId: session.id,
      bookingId: booking.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    console.error('Seller Stripe Checkout Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
