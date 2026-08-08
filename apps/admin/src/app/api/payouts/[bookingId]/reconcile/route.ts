import { NextResponse } from "next/server";
import { gateAdminApi, isNextResponse } from "@/lib/auth";
import { reconcilePayoutReadyForBooking } from "@/lib/payout-reconcile";
import { supabase } from "@/lib/server";

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

/**
 * Admin/internal: repair payout_ready for a booking already at status=completed.
 * Idempotent — safe to retry after partial failures from the driver progress route.
 * Does not allow drivers to invent payouts; does not change booking.status.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = gateAdminApi(request);
  if (isNextResponse(auth)) return auth;

  const { bookingId } = await context.params;
  const result = await reconcilePayoutReadyForBooking(bookingId);

  if (result.ok === false) {
    return NextResponse.json(
      {
        error: result.error,
        partial: result.partial ?? false,
        bookingId: result.bookingId,
        reconcile: true,
      },
      { status: result.status }
    );
  }

  await supabase.from("audit_events").insert({
    actor_user_id: auth.actorUserId,
    actor_role: "admin",
    action: result.alreadyReady ? "payout_reconcile_noop" : "payout_reconcile_applied",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: {
      paymentStatus: result.paymentStatus,
      payoutId: result.payoutId,
      authMode: auth.mode,
    },
  });

  return NextResponse.json({
    success: true,
    alreadyReady: result.alreadyReady,
    bookingId: result.bookingId,
    paymentStatus: result.paymentStatus,
    payoutId: result.payoutId,
  });
}
