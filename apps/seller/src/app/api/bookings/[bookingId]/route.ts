import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

type SafeBookingPatch = {
  seller_payment_confirmed?: boolean;
  seller_paid_delivery?: boolean;
};

const toPublicBooking = (booking: any) => {
  const quote = Array.isArray(booking.quotes) ? booking.quotes[0] : booking.quotes;
  const pickup = Array.isArray(booking.pickup_contacts) ? booking.pickup_contacts[0] : booking.pickup_contacts;
  const delivery = Array.isArray(booking.delivery_addresses) ? booking.delivery_addresses[0] : booking.delivery_addresses;

  return {
    id: booking.id,
    status: booking.status,
    payment_status: booking.payment_status,
    accepted_price: booking.accepted_price,
    delivery_quote_amount: booking.delivery_quote_amount,
    total_price: booking.accepted_price ?? booking.delivery_quote_amount ?? quote?.total_price ?? null,
    item_title: booking.item_title,
    item_size: booking.item_size,
    approximate_weight_kg: booking.approximate_weight_kg,
    fragile: booking.fragile,
    requires_two_people: booking.requires_two_people,
    requires_van: booking.requires_van,
    pickup_town: pickup?.town ?? quote?.pickup_town ?? null,
    pickup_postcode: pickup?.postcode ?? quote?.pickup_postcode ?? null,
    delivery_town: delivery?.town ?? quote?.delivery_town ?? null,
    delivery_postcode: delivery?.postcode ?? quote?.delivery_postcode ?? null,
    scheduled_collection_start: booking.scheduled_collection_start,
    scheduled_collection_end: booking.scheduled_collection_end,
    seller_payment_confirmed: booking.seller_payment_confirmed,
    seller_paid_delivery: booking.seller_paid_delivery,
    quote: quote ?? null,
  };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        quotes (*),
        pickup_contacts (*),
        delivery_addresses (*)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking: toPublicBooking(data) });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params;
    const body = await request.json() as SafeBookingPatch;

    const safePatch: SafeBookingPatch = {};

    if (typeof body.seller_payment_confirmed === 'boolean') {
      safePatch.seller_payment_confirmed = body.seller_payment_confirmed;
    }

    if (typeof body.seller_paid_delivery === 'boolean') {
      safePatch.seller_paid_delivery = body.seller_paid_delivery;
    }

    if (Object.keys(safePatch).length === 0) {
      return NextResponse.json({ error: 'No allowed booking fields supplied' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(safePatch)
      .eq('id', bookingId)
      .select(`
        *,
        quotes (*),
        pickup_contacts (*),
        delivery_addresses (*)
      `)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update booking' }, { status: 400 });
    }

    return NextResponse.json({ booking: toPublicBooking(data) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
