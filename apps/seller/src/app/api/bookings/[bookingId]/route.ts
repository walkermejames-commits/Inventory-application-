import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/server";
import {
  canPerformBookingAction,
  extractAccessTokenFromRequest,
  resolveBookingAccess,
  type BookingAccessAction,
} from "@/src/lib/booking-access";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

type SafeBookingPatch = {
  seller_payment_confirmed?: boolean;
  seller_paid_delivery?: boolean;
  quote_confirmed?: boolean;
  token?: string;
};

const asPositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toPublicBooking = (booking: any) => {
  const quote = Array.isArray(booking.quotes) ? booking.quotes[0] : booking.quotes;
  const pickup = Array.isArray(booking.pickup_contacts)
    ? booking.pickup_contacts[0]
    : booking.pickup_contacts;
  const delivery = Array.isArray(booking.delivery_addresses)
    ? booking.delivery_addresses[0]
    : booking.delivery_addresses;

  return {
    id: booking.id,
    status: booking.status,
    payment_status: booking.payment_status,
    accepted_price: booking.accepted_price,
    delivery_quote_amount: booking.delivery_quote_amount,
    total_price:
      booking.accepted_price ??
      booking.delivery_quote_amount ??
      quote?.total_price ??
      null,
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

async function loadBookingForAccess(bookingId: string) {
  return supabase
    .from("bookings")
    .select(
      `
      *,
      quotes (*),
      pickup_contacts (*)
    `
    )
    .eq("id", bookingId)
    .single();
}

function authorize(
  booking: any,
  token: string | null,
  action: BookingAccessAction
) {
  const pickup = Array.isArray(booking.pickup_contacts)
    ? booking.pickup_contacts[0]
    : booking.pickup_contacts;

  const access = resolveBookingAccess({
    providedToken: token,
    buyerTokenHash: booking.private_buyer_token_hash,
    sellerTokenHash: pickup?.secure_token_hash,
  });

  if (!access.ok) {
    return access;
  }

  if (!canPerformBookingAction(access.role, action)) {
    return {
      ok: false as const,
      status: 403,
      error: `Token role '${access.role}' cannot perform '${action}'`,
    };
  }

  return access;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params;
    const token = extractAccessTokenFromRequest(request);

    const { data, error } = await loadBookingForAccess(bookingId);

    if (error || !data) {
      // Do not leak existence without token — still require token first if missing
      if (!token) {
        return NextResponse.json(
          { error: "Access token is required" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: error?.message || "Booking not found" },
        { status: 404 }
      );
    }

    const access = authorize(data, token, "read");
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Re-fetch with delivery for public shape
    const { data: full, error: fullError } = await supabase
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

    if (fullError || !full) {
      return NextResponse.json(
        { error: fullError?.message || "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking: toPublicBooking(full) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { bookingId } = await context.params;
    const body = (await request.json()) as SafeBookingPatch;
    const token = extractAccessTokenFromRequest(request, body as Record<string, unknown>);

    const { data: booking, error: lookupError } = await loadBookingForAccess(bookingId);

    if (lookupError || !booking) {
      if (!token) {
        return NextResponse.json(
          { error: "Access token is required" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: lookupError?.message || "Booking not found" },
        { status: 404 }
      );
    }

    if (body.quote_confirmed === true) {
      const access = authorize(booking, token, "quote_confirm");
      if (access.ok === false) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }

      if (booking.payment_status === "paid") {
        return NextResponse.json(
          { error: "This booking has already been paid" },
          { status: 400 }
        );
      }

      const confirmedAmount = asPositiveNumber(booking.delivery_quote_amount);
      if (!confirmedAmount) {
        return NextResponse.json(
          { error: "No delivery quote exists for this booking yet" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          accepted_price: confirmedAmount,
          status: "awaiting_payment",
          payment_status: "payment_pending",
        })
        .eq("id", bookingId)
        .select(
          `
          *,
          quotes (*),
          pickup_contacts (*),
          delivery_addresses (*)
        `
        )
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || "Failed to confirm quote" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        booking: toPublicBooking(data),
        checkoutUrl: `/checkout/${bookingId}?token=${encodeURIComponent(token!)}`,
      });
    }

    const safePatch: Omit<SafeBookingPatch, "quote_confirmed" | "token"> = {};
    if (typeof body.seller_payment_confirmed === "boolean") {
      safePatch.seller_payment_confirmed = body.seller_payment_confirmed;
    }
    if (typeof body.seller_paid_delivery === "boolean") {
      safePatch.seller_paid_delivery = body.seller_paid_delivery;
    }

    if (Object.keys(safePatch).length === 0) {
      return NextResponse.json(
        { error: "No allowed booking fields supplied" },
        { status: 400 }
      );
    }

    const access = authorize(booking, token, "seller_flags");
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(safePatch)
      .eq("id", bookingId)
      .select(
        `
        *,
        quotes (*),
        pickup_contacts (*),
        delivery_addresses (*)
      `
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to update booking" },
        { status: 400 }
      );
    }

    return NextResponse.json({ booking: toPublicBooking(data) });
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
