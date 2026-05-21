'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useParams } from 'next/navigation';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type CheckoutBooking = {
  id?: string;
  pickup_town?: string;
  delivery_town?: string;
  total_price?: number | string;
  accepted_price?: number | string;
  delivery_quote_amount?: number | string;
  status?: string;
  payment_status?: string;
};

export default function CheckoutPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<CheckoutBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    let cancelled = false;

    async function loadBooking() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Booking not found');
        }

        if (!cancelled) {
          setBooking(data.booking || data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load booking');
          setBooking(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe could not be loaded. Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Could not start checkout');
      }

      if (!data.sessionId) {
        throw new Error('Checkout session was not returned by the server.');
      }

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });

      if (result.error) {
        throw new Error(result.error.message || 'Stripe checkout failed to open');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div>Loading checkout...</div>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">Booking not found</h1>
          {error && <p className="text-zinc-400">{error}</p>}
        </div>
      </main>
    );
  }

  const total = booking.total_price ?? booking.accepted_price ?? booking.delivery_quote_amount ?? 'TBC';

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Complete Your Booking</h1>

        <div className="bg-white text-black shadow rounded-xl p-8">
          <div className="space-y-4 mb-8">
            <p><strong>Pickup:</strong> {booking.pickup_town || 'To be confirmed'}</p>
            <p><strong>Delivery:</strong> {booking.delivery_town || 'To be confirmed'}</p>
            <p><strong>Total:</strong> {typeof total === 'number' ? `£${total.toFixed(2)}` : `£${total}`}</p>
            {booking.status && <p><strong>Status:</strong> {booking.status.replace(/_/g, ' ')}</p>}
            {booking.payment_status && <p><strong>Payment:</strong> {booking.payment_status.replace(/_/g, ' ')}</p>}
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-black text-white py-4 rounded-xl text-lg font-medium hover:bg-gray-800 disabled:opacity-60"
          >
            {checkoutLoading ? 'Opening Stripe...' : 'Pay Securely with Stripe'}
          </button>
        </div>
      </div>
    </main>
  );
}
