"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BuyerJourneyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/buy/create-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not create quote");
      }

      router.push(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Buyer-led delivery
          </div>

          <h1 className="text-5xl font-black tracking-tight">
            Need something collected and delivered?
          </h1>

          <p className="mt-5 text-lg text-slate-300">
            Tell Door in Four where the item is, where it is going, and what needs moving. We will calculate your quote instantly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-black">Collection details</h2>

            <div className="mt-6 space-y-4">
              <input name="pickupTown" placeholder="Pickup town" required className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="pickupPostcode" placeholder="Pickup postcode" required className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="pickupAddress" placeholder="Pickup address" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="sellerName" placeholder="Seller/contact name" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="sellerPhone" placeholder="Seller/contact phone" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-black">Delivery details</h2>

            <div className="mt-6 space-y-4">
              <input name="deliveryTown" placeholder="Delivery town" required className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="deliveryPostcode" placeholder="Delivery postcode" required className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="deliveryAddress" placeholder="Delivery address" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="buyerName" placeholder="Your name" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="buyerPhone" placeholder="Your phone" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 lg:col-span-2">
            <h2 className="text-2xl font-black">Item details</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input name="itemTitle" placeholder="Item title" required className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />

              <select name="itemSize" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="furniture">Furniture</option>
                <option value="van_load">Van load</option>
              </select>

              <input name="approximateWeightKg" type="number" placeholder="Approximate weight (kg)" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />

              <select name="urgency" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                <option value="scheduled">Scheduled</option>
                <option value="same_day">Same day</option>
                <option value="asap">ASAP</option>
              </select>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                <input type="checkbox" name="fragile" /> Fragile item
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                <input type="checkbox" name="requiresVan" /> Requires van
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                <input type="checkbox" name="requiresTwoPeople" /> Requires two people
              </label>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 rounded-2xl bg-emerald-400 px-8 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {loading ? "Calculating quote..." : "Continue to quote"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
