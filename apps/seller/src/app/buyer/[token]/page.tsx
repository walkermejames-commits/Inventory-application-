"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function BuyerDeliveryDetails() {
  const params = useParams();
  const token = params.token as string;

  const [form, setForm] = useState({
    buyerName: "",
    buyerPhone: "",
    buyerEmail: "",
    deliveryTown: "",
    deliveryPostcode: "",
    deliveryAddress: "",
    preferredDeliveryWindow: "",
    stairsNotes: "",
    deliveryNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/buyer/submit-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });

      if (!res.ok) throw new Error("Failed to submit details");

      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8 max-w-xl mx-auto flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl">✅</div>
          <h1 className="text-3xl font-bold">Delivery details submitted!</h1>
          <p className="text-zinc-400 max-w-sm mx-auto">
            The seller has been notified. They will confirm and arrange payment for delivery.
          </p>
          <p className="text-sm text-zinc-500">You can close this page. The seller will contact you with collection details.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 max-w-xl mx-auto">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Add your delivery details</h1>
          <p className="text-zinc-400 mt-2">This is only for the delivery — the seller handles item payment directly with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 p-8 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-1.5">Your name</label>
              <input 
                type="text" 
                value={form.buyerName} 
                onChange={(e) => setForm({...form, buyerName: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Phone</label>
              <input 
                type="tel" 
                value={form.buyerPhone} 
                onChange={(e) => setForm({...form, buyerPhone: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5">Email (optional)</label>
            <input 
              type="email" 
              value={form.buyerEmail} 
              onChange={(e) => setForm({...form, buyerEmail: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Delivery town</label>
              <input 
                type="text" 
                value={form.deliveryTown} 
                onChange={(e) => setForm({...form, deliveryTown: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Delivery postcode</label>
              <input 
                type="text" 
                value={form.deliveryPostcode} 
                onChange={(e) => setForm({...form, deliveryPostcode: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5">Delivery address</label>
            <input 
              type="text" 
              value={form.deliveryAddress} 
              onChange={(e) => setForm({...form, deliveryAddress: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">Preferred delivery window</label>
            <input 
              type="text" 
              value={form.preferredDeliveryWindow} 
              onChange={(e) => setForm({...form, preferredDeliveryWindow: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
              placeholder="e.g. Tomorrow afternoon, Friday morning" 
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">Stairs / access notes (optional)</label>
            <textarea 
              value={form.stairsNotes} 
              onChange={(e) => setForm({...form, stairsNotes: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 h-20" 
              placeholder="e.g. 2nd floor, no lift" 
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">Any other delivery notes</label>
            <textarea 
              value={form.deliveryNotes} 
              onChange={(e) => setForm({...form, deliveryNotes: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 h-20" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-white text-black py-4 rounded-xl font-semibold disabled:opacity-50 mt-4"
          >
            {isSubmitting ? "Submitting..." : "Submit delivery details"}
          </button>

          <p className="text-xs text-center text-zinc-500 pt-4">
            Item payment is handled directly between you and the seller. This is only for arranging delivery.
          </p>
        </form>
      </div>
    </main>
  );
}