'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type QuoteBooking = {
  id: string;
  status?: string;
  payment_status?: string;
  pickup_town?: string | null;
  pickup_postcode?: string | null;
  delivery_town?: string | null;
  delivery_postcode?: string | null;
  item_title?: string | null;
  item_size?: string | null;
  approximate_weight_kg?: number | string | null;
  fragile?: boolean | null;
  requires_two_people?: boolean | null;
  requires_van?: boolean | null;
  delivery_quote_amount?: number | string | null;
  accepted_price?: number | string | null;
};

const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `£${amount.toFixed(2)}` : 'TBC';
};

export default function QuoteReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const accessToken = searchParams.get('token') || '';

  const [booking, setBooking] = useState<QuoteBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    let cancelled = false;

    async function loadBooking() {
      try {
        setLoading(true);
        setError(null);

        if (!accessToken) {
          throw new Error('Missing access token. Open this page from your quote link.');
        }

        const res = await fetch(
          `/api/bookings/${bookingId}?token=${encodeURIComponent(accessToken)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Could not load quote');
        }

        if (!cancelled) {
          setBooking(data.booking || data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load quote');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId, accessToken]);

  const continueToPayment = async () => {
    if (!booking) return;

    setSubmitting(true);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error('Missing access token');
      }

      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_confirmed: true, token: accessToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Could not confirm quote');
      }

      router.push(
        data.checkoutUrl ||
          `/checkout/${booking.id}?token=${encodeURIComponent(accessToken)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm quote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <p>Loading your delivery quote...</p>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">Quote not found</h1>
          <p className="text-zinc-400 mb-8">{error}</p>
          <Link href="/" className="rounded-xl bg-white px-5 py-3 font-semibold text-black">Back home</Link>
        </div>
      </main>
    );
  }

  if (!booking) return null;

  const quoteAmount = booking.delivery_quote_amount;
  const hasQuote = Number(quoteAmount) > 0;

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white py-12 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="text-sm font-semibold tracking-[2px] text-emerald-400">DOOR IN FOUR</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Review your delivery quote</h1>
          <p className="mt-4 text-lg text-zinc-400">
            This is the delivery price. Item payment stays between buyer and seller.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-xl">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-black/30 p-5">
              <div className="text-sm text-zinc-500">Pickup</div>
              <div className="mt-1 text-xl font-bold">{booking.pickup_town || 'To be confirmed'}</div>
              <div className="mt-1 text-sm text-zinc-400">{booking.pickup_postcode || ''}</div>
            </div>

            <div className="rounded-2xl bg-black/30 p-5">
              <div className="text-sm text-zinc-500">Delivery</div>
              <div className="mt-1 text-xl font-bold">{booking.delivery_town || 'To be confirmed'}</div>
              <div className="mt-1 text-sm text-zinc-400">{booking.delivery_postcode || ''}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-black/30 p-5">
            <div className="text-sm text-zinc-500">Item</div>
            <div className="mt-1 text-xl font-bold">{booking.item_title || 'Marketplace item'}</div>
            <div className="mt-2 text-sm text-zinc-400">
              {booking.item_size || 'medium'} • {booking.approximate_weight_kg || 'TBC'}kg
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {booking.fragile && <span className="rounded-full bg-white/10 px-3 py-2">Fragile</span>}
              {booking.requires_two_people && <span className="rounded-full bg-white/10 px-3 py-2">Two-person carry</span>}
              {booking.requires_van && <span className="rounded-full bg-white/10 px-3 py-2">Van required</span>}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-emerald-400/40 bg-emerald-400/10 p-8 text-center">
            <div className="text-sm font-semibold uppercase tracking-[2px] text-emerald-300">Delivery price</div>
            <div className="mt-3 text-6xl font-black text-white">{money(quoteAmount)}</div>
            <p className="mt-4 text-sm text-emerald-100">
              You will only be sent to Stripe after confirming this quote.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          <button
            onClick={continueToPayment}
            disabled={!hasQuote || submitting}
            className="mt-8 w-full rounded-2xl bg-white px-6 py-5 text-lg font-black text-black hover:bg-zinc-100 disabled:opacity-50"
          >
            {submitting ? 'Confirming quote...' : 'Accept quote and continue to payment'}
          </button>

          {!hasQuote && (
            <p className="mt-4 text-center text-sm text-zinc-500">
              A delivery quote has not been calculated yet. Please go back and submit delivery details first.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
