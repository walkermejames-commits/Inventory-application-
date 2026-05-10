"use client";

import { useMemo, useState } from "react";

type QuoteResult = {
  id: string;
  total_price?: number;
  driver_payout_estimate?: number;
  expires_at?: string;
  quote_breakdown?: {
    breakdown?: string[];
    totalBuyerPrice?: number;
    subtotal?: number;
    platformServiceFee?: number;
  };
};

const buyerId = "00000000-0000-0000-0000-000000000001";

function estimateDistance(pickupPostcode: string, deliveryPostcode: string) {
  const cleanPickup = pickupPostcode.trim().toUpperCase();
  const cleanDelivery = deliveryPostcode.trim().toUpperCase();

  if (!cleanPickup || !cleanDelivery) return 4;
  if (cleanPickup.slice(0, 3) === cleanDelivery.slice(0, 3)) return 3;
  if (cleanPickup.slice(0, 2) === cleanDelivery.slice(0, 2)) return 7;
  return 12;
}

function itemDefaults(itemSize: string) {
  if (itemSize === "small") return { weight: 5, requiresVan: false, requiresTwoPeople: false };
  if (itemSize === "medium") return { weight: 12, requiresVan: false, requiresTwoPeople: false };
  if (itemSize === "large") return { weight: 25, requiresVan: true, requiresTwoPeople: false };
  if (itemSize === "furniture") return { weight: 45, requiresVan: true, requiresTwoPeople: true };
  return { weight: 60, requiresVan: true, requiresTwoPeople: true };
}

export default function QuoteForm() {
  const [pickupTown, setPickupTown] = useState("Tunbridge Wells");
  const [deliveryTown, setDeliveryTown] = useState("Tunbridge Wells");
  const [pickupPostcode, setPickupPostcode] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [itemSize, setItemSize] = useState("medium");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState("scheduled");
  const [fragile, setFragile] = useState(false);
  const [pickupStairsFloors, setPickupStairsFloors] = useState(0);
  const [deliveryStairsFloors, setDeliveryStairsFloors] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);

  const defaults = useMemo(() => itemDefaults(itemSize), [itemSize]);

  async function submitQuote() {
    setStatus("loading");
    setMessage("");
    setQuote(null);

    try {
      const routeDistanceMiles = estimateDistance(pickupPostcode, deliveryPostcode);
      const payload = {
        buyerId,
        pickupTown,
        deliveryTown,
        pickupPostcode,
        deliveryPostcode,
        itemSize,
        approximateWeightKg: defaults.weight,
        quantity,
        urgency,
        routeDistanceMiles,
        routeDurationMinutes: Math.max(12, routeDistanceMiles * 5),
        fragile,
        pickupStairsFloors,
        deliveryStairsFloors,
        requiresTwoPeople: defaults.requiresTwoPeople,
        requiresVan: defaults.requiresVan
      };

      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Quote request failed");
      }

      setQuote(result.quote);
      setStatus("success");
      setMessage("Quote created and saved to Supabase.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong creating the quote.");
    }
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white p-6 text-slate-950 shadow-2xl shadow-black/40">
      <div className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Quote request</p>
        <h2 className="mt-2 text-3xl font-black">Start your delivery</h2>
        <p className="mt-2 text-sm text-slate-600">
          Submit the form and Door in Four will create a real quote record in Supabase.
        </p>
      </div>

      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Pickup town</span>
            <input value={pickupTown} onChange={(event) => setPickupTown(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Delivery town</span>
            <input value={deliveryTown} onChange={(event) => setDeliveryTown(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Pickup postcode</span>
            <input value={pickupPostcode} onChange={(event) => setPickupPostcode(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm uppercase outline-none ring-violet-500 focus:ring-2" placeholder="TN1 1AA" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Delivery postcode</span>
            <input value={deliveryPostcode} onChange={(event) => setDeliveryPostcode(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm uppercase outline-none ring-violet-500 focus:ring-2" placeholder="TN4 8AB" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">What are we moving?</span>
          <select value={itemSize} onChange={(event) => setItemSize(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2">
            <option value="small">Small parcel</option>
            <option value="medium">Medium box</option>
            <option value="large">Large item</option>
            <option value="furniture">Furniture item</option>
            <option value="van_load">Van load</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Quantity</span>
            <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Urgency</span>
            <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2">
              <option value="flexible">Flexible</option>
              <option value="scheduled">Scheduled</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="same_day">Same day</option>
              <option value="asap">ASAP</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Pickup flights of stairs</span>
            <input type="number" min="0" max="4" value={pickupStairsFloors} onChange={(event) => setPickupStairsFloors(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="0 to 4" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Delivery flights of stairs</span>
            <input type="number" min="0" max="4" value={deliveryStairsFloors} onChange={(event) => setDeliveryStairsFloors(Number(event.target.value))} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="0 to 4" />
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={fragile} onChange={(event) => setFragile(event.target.checked)} className="h-5 w-5" />
          Fragile or delicate item
        </label>

        <button type="button" onClick={submitQuote} disabled={status === "loading"} className="w-full rounded-full bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-400">
          {status === "loading" ? "Creating quote..." : "Request quote"}
        </button>
      </form>

      {message ? (
        <div className={`mt-5 rounded-2xl p-4 text-sm font-bold ${status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}

      {quote ? (
        <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-200">Quote created</p>
          <p className="mt-2 text-4xl font-black">£{Number(quote.total_price ?? quote.quote_breakdown?.totalBuyerPrice ?? 0).toFixed(2)}</p>
          <p className="mt-2 break-all text-xs text-slate-300">Quote ID: {quote.id}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {(quote.quote_breakdown?.breakdown ?? []).map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
