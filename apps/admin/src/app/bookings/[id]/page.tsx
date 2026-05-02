import { supabase } from "@/lib/server";

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*,quotes(*),pickup_contacts(*),delivery_addresses(*),payments(*),photos(*),status_events(*),admin_notes(*),disputes(*),audit_events(*)")
    .eq("id", params.id)
    .single();

  if (!booking) return <main className="p-8">Booking not found</main>;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-xl font-semibold">Booking {booking.id}</h1>
      <p>Status: {booking.status}</p>
      <p>Payment: {booking.payment_status}</p>
      <p>Accepted price: £{booking.accepted_price}</p>
      <p>Buyer: {booking.buyer_id}</p>
      <p>Driver: {booking.driver_id ?? "Unassigned"}</p>
      <h2 className="font-semibold">Quote breakdown</h2>
      <pre className="bg-slate-100 p-2 text-xs overflow-auto">{JSON.stringify(booking.quotes?.quote_breakdown ?? {}, null, 2)}</pre>
      <h2 className="font-semibold">Status history</h2>
      <ul className="list-disc ml-6">{booking.status_events?.map((e: any) => <li key={e.id}>{e.new_status} ({e.actor_role})</li>)}</ul>
      <h2 className="font-semibold">Audit log</h2>
      <ul className="list-disc ml-6">{booking.audit_events?.map((e: any) => <li key={e.id}>{e.action}</li>)}</ul>
    </main>
  );
}
