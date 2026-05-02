import { NextResponse } from "next/server";
import { stripe, supabase } from "@/lib/server";
import { computeCancellationFee } from "@door-in-four/shared";

export async function POST(request: Request, { params }: { params: { paymentId: string } }) {
  const { amount, reason, actorUserId } = await request.json();
  const { data: payment } = await supabase.from("payments").select("*, bookings(status)").eq("id", params.paymentId).single();
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const cancellationFee = computeCancellationFee(payment.bookings.status, Number(payment.amount));
  const maxRefund = Math.max(0, Number(payment.amount) - cancellationFee);
  const refundAmount = Math.min(amount ?? maxRefund, maxRefund);

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripe_payment_intent_id,
    amount: Math.round(refundAmount * 100),
    reason: "requested_by_customer"
  });

  await supabase.from("refunds").insert({
    payment_id: params.paymentId,
    stripe_refund_id: refund.id,
    amount: refundAmount,
    reason: `${reason ?? "admin_refund"}; cancellation_fee=${cancellationFee}`,
    status: refund.status
  });

  await supabase.from("payments").update({ status: refundAmount < payment.amount ? "partially_refunded" : "refunded" }).eq("id", params.paymentId);

  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    actor_role: "admin",
    action: "refund_issued",
    entity_type: "payment",
    entity_id: payment.id,
    metadata: { refund_id: refund.id, refund_amount: refundAmount, cancellation_fee: cancellationFee }
  });

  return NextResponse.json({ refundId: refund.id, refundAmount, cancellationFee });
}
