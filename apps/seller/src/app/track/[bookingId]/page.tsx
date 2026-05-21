'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Booking = {
  id: string;
  status?: string;
  payment_status?: string;
  pickup_town?: string | null;
  delivery_town?: string | null;
  driver_name?: string | null;
  driver_vehicle?: string | null;
  driver_lat?: number | null;
  driver_lng?: number | null;
  eta_minutes?: number | null;
  total_price?: number | string | null;
  accepted_price?: number | string | null;
  delivery_quote_amount?: number | string | null;
  item_title?: string | null;
  created_at?: string | null;
};

const statusLabels: Record<string, string> = {
  seller_quote_pending: 'Waiting for buyer details',
  awaiting_payment: 'Awaiting payment',
  payment_failed: 'Payment failed',
  paid_awaiting_dispatch: 'Paid, awaiting driver dispatch',
  driver_assigned: 'Driver assigned',
  driver_en_route_to_pickup: 'Driver heading to pickup',
  driver_arrived_at_pickup: 'Driver arrived at pickup',
  pickup_verified: 'Pickup verified',
  item_collected: 'Item collected',
  driver_en_route_to_delivery: 'Driver heading to delivery',
  driver_arrived_at_delivery: 'Driver arrived at delivery',
  delivery_verified: 'Delivery verified',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const formatMoney = (value: Booking['total_price']) => {
  if (value === null || value === undefined || value === '') return 'TBC';
  const amount = Number(value);
  return Number.isFinite(amount) ? `£${amount.toFixed(2)}` : `£${value}`;
};

export default function TrackBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId as string;
  const checkoutStatus = searchParams.get('checkout');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Booking not found');
      }

      setBooking(data.booking || data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingId) return;

    fetchBooking();
    const interval = window.setInterval(fetchBooking, 8000);

    return () => window.clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-4 border-4 border-white border-t-transparent rounded-full" />
          <p>Loading live tracking...</p>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-3">Booking not found</h1>
          <p className="text-zinc-400 mb-8">{error || 'Please check the link or contact Door in Four support.'}</p>
          <Link href="/" className="inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-100">
            Back to Door in Four
          </Link>
        </div>
      </main>
    );
  }

  const total = booking.total_price ?? booking.accepted_price ?? booking.delivery_quote_amount;
  const status = booking.status || 'unknown';
  const statusLabel = statusLabels[status] || status.replace(/_/g, ' ');
  const hasDriverLocation = typeof booking.driver_lat === 'number' && typeof booking.driver_lng === 'number';

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white py-10 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium tracking-[2px] text-emerald-400">DOOR IN FOUR</div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Track your delivery</h1>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            Back home
          </Link>
        </div>

        {checkoutStatus === 'success' && (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Stripe checkout completed. If the status has not updated yet, the payment webhook may still need to confirm the booking.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-400">Booking</div>
                <div className="font-mono text-sm text-zinc-300">{booking.id}</div>
              </div>
              <div className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                {statusLabel}
              </div>
            </div>

            <div className="rounded-2xl bg-black/40 p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-zinc-500">Pickup</div>
                  <div className="mt-1 text-xl font-semibold">{booking.pickup_town || 'To be confirmed'}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Delivery</div>
                  <div className="mt-1 text-xl font-semibold">{booking.delivery_town || 'To be confirmed'}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Item</div>
                  <div className="mt-1 text-xl font-semibold">{booking.item_title || 'Marketplace item'}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Delivery price</div>
                  <div className="mt-1 text-xl font-semibold">{formatMoney(total)}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
              <h2 className="mb-4 text-xl font-semibold">Driver</h2>
              {booking.driver_name ? (
                <div className="space-y-2 text-zinc-300">
                  <p><strong className="text-white">Name:</strong> {booking.driver_name}</p>
                  {booking.driver_vehicle && <p><strong className="text-white">Vehicle:</strong> {booking.driver_vehicle}</p>}
                  {booking.eta_minutes !== null && booking.eta_minutes !== undefined && (
                    <p><strong className="text-white">ETA:</strong> about {booking.eta_minutes} minutes</p>
                  )}
                </div>
              ) : (
                <p className="text-zinc-400">A driver has not been assigned yet.</p>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Live location</h2>
            <div className="flex h-80 items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-zinc-400">
              {hasDriverLocation ? (
                <div>
                  <div className="mb-3 text-4xl">📍</div>
                  <p className="text-white">Driver location available</p>
                  <p className="mt-2 text-sm">Lat {booking.driver_lat}, Lng {booking.driver_lng}</p>
                  <p className="mt-4 text-xs text-zinc-500">Map component still needs DriverMap.tsx.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-3 text-4xl">🛰️</div>
                  <p>No live driver location yet.</p>
                  <p className="mt-2 text-sm">This page refreshes every 8 seconds.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
