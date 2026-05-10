import Link from "next/link";
import { supabase } from "@/lib/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function JsonPanel({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100 shadow-inner">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: booking } = await supabase
    .from("bookings")
    .select("*,quotes(*),pickup_contacts(*),delivery_addresses(*),payments(*),photos(*),status_events(*),admin_notes(*),disputes(*),audit_events(*)")
    .eq("id", id)
    .single();

  if (!booking) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-black">Booking not found</h1>
          <p className="mt-3 text-slate-600">No booking exists for this reference.</p>
          <Link href="/bookings" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white">
            Back to bookings
          </Link>
        </div>
      </main>
    );
  }

  const statusEvents = booking.status_events ?? [];
  const auditEvents = booking.audit_events ?? [];
  const notes = booking.admin_notes ?? [];
  const disputes = booking.disputes ?? [];
  const photos = booking.photos ?? [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/bookings" className="text-sm font-bold text-violet-300 hover:text-violet-200">
                ← Back to bookings
              </Link>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Booking detail
              </p>
              <h1 className="mt-2 break-all text-3xl font-black tracking-tight sm:text-4xl">
                {booking.id}
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300">
                Operational overview for dispatch, payment state, driver assignment and booking history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-violet-500/20 px-4 py-2 text-sm font-bold text-violet-100 ring-1 ring-violet-300/30">
                {booking.status}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-100 ring-1 ring-emerald-300/30">
                {booking.payment_status || "payment pending"}
              </span>
            </div>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/70">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Accepted price</p>
            <p className="mt-3 text-3xl font-black">{formatMoney(booking.accepted_price)}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/70">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Driver payout</p>
            <p className="mt-3 text-3xl font-black">{formatMoney(booking.driver_payout_amount)}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/70">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Buyer</p>
            <p className="mt-3 break-all font-mono text-sm text-slate-700">{booking.buyer_id || "Unknown"}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/70">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Driver</p>
            <p className="mt-3 break-all font-mono text-sm text-slate-700">{booking.driver_id || "Unassigned"}</p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-8">
            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-black">Quote breakdown</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Created {formatDate(booking.created_at)}
                </span>
              </div>
              <JsonPanel value={booking.quotes?.quote_breakdown ?? booking.quotes ?? {}} />
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
              <h2 className="text-xl font-black">Status history</h2>
              <div className="mt-5 space-y-3">
                {statusEvents.length ? (
                  statusEvents.map((event: any) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                          {event.new_status}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(event.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Actor: <span className="font-semibold">{event.actor_role || "system"}</span>
                        {event.note ? ` · ${event.note}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No status events recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
              <h2 className="text-xl font-black">Operational records</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">Payments</p>
                  <p className="mt-1 text-2xl font-black">{booking.payments?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">Photos</p>
                  <p className="mt-1 text-2xl font-black">{photos.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">Notes</p>
                  <p className="mt-1 text-2xl font-black">{notes.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">Disputes</p>
                  <p className="mt-1 text-2xl font-black">{disputes.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
              <h2 className="text-xl font-black">Pickup contact</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><span className="font-bold text-slate-900">Name:</span> {booking.pickup_contacts?.seller_name || "Not set"}</p>
                <p><span className="font-bold text-slate-900">Phone:</span> {booking.pickup_contacts?.seller_phone || "Not set"}</p>
                <p><span className="font-bold text-slate-900">Postcode:</span> {booking.pickup_contacts?.postcode || "Not set"}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
              <h2 className="text-xl font-black">Delivery address</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><span className="font-bold text-slate-900">Recipient:</span> {booking.delivery_addresses?.recipient_name || "Not set"}</p>
                <p><span className="font-bold text-slate-900">Phone:</span> {booking.delivery_addresses?.recipient_phone || "Not set"}</p>
                <p><span className="font-bold text-slate-900">Postcode:</span> {booking.delivery_addresses?.postcode || "Not set"}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70">
              <h2 className="text-xl font-black">Audit log</h2>
              <div className="mt-5 space-y-3">
                {auditEvents.length ? (
                  auditEvents.slice(0, 8).map((event: any) => (
                    <div key={event.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <p className="font-bold text-slate-900">{event.action}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No audit events recorded yet.</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
