"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function BuyerDeliveryDetails() {
  const params = useParams();
  const token = params.token as string;

  const [form, setForm] = useState({
    buyerName: "",
    buyerPhone: "",
    buyerEmail: "",
    deliveryTown: "Royal Tunbridge Wells",
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
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8">
            <div className="text-5xl">✅</div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">Thank you!</h1>
          <p className="text-xl text-zinc-400 mb-8">Your delivery details have been sent to the seller.</p>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">The seller will confirm and arrange payment for delivery. You'll receive a collection update soon.</p>
          
          <div className="mt-12 text-xs text-zinc-600">Door in Four • Local delivery for West Kent</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white py-12">
      <div className="max-w-xl mx-auto px-6">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1 rounded-full bg-white/10 text-xs tracking-widest">DOOR IN FOUR</div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Add your delivery details</h1>
          <p className="mt-4 text-xl text-zinc-400">The seller has invited you to arrange delivery for your purchase.</p>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 mb-8">
          <div className="mb-8 p-5 bg-emerald-950/50 border border-emerald-900 rounded-2xl text-sm">
            <strong className="text-emerald-400">Important:</strong> Item payment stays between you and the seller. Door in Four only handles the delivery fee.
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Your name</label>
                <input type="text" value={form.buyerName} onChange={(e) => setForm({...form, buyerName: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" required />
              </div>
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Phone number</label>
                <input type="tel" value={form.buyerPhone} onChange={(e) => setForm({...form, buyerPhone: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" required />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-zinc-400">Email (optional)</label>
              <input type="email" value={form.buyerEmail} onChange={(e) => setForm({...form, buyerEmail: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" />
            </div>

            <div>
              <div className="uppercase text-xs tracking-[1.5px] text-zinc-500 mb-4">DELIVERY ADDRESS</div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2 text-zinc-400">Town</label>
                  <input type="text" value={form.deliveryTown} onChange={(e) => setForm({...form, deliveryTown: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" required />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-zinc-400">Postcode</label>
                  <input type="text" value={form.deliveryPostcode} onChange={(e) => setForm({...form, deliveryPostcode: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" required />
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm mb-2 text-zinc-400">Full address</label>
                <input type="text" value={form.deliveryAddress} onChange={(e) => setForm({...form, deliveryAddress: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" required />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-zinc-400">Preferred delivery time</label>
              <input type="text" value={form.preferredDeliveryWindow} onChange={(e) => setForm({...form, preferredDeliveryWindow: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" placeholder="e.g. Tomorrow afternoon or Friday 9am-12pm" />
            </div>

            <div>
              <label className="block text-sm mb-2 text-zinc-400">Stairs or access notes (optional)</label>
              <textarea value={form.stairsNotes} onChange={(e) => setForm({...form, stairsNotes: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 h-20" placeholder="e.g. 2nd floor flat, no lift" />
            </div>

            <div>
              <label className="block text-sm mb-2 text-zinc-400">Anything else we should know?</label>
              <textarea value={form.deliveryNotes} onChange={(e) => setForm({...form, deliveryNotes: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 h-20" />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 bg-white text-black rounded-2xl font-semibold text-lg disabled:opacity-60 hover:bg-zinc-100 active:bg-zinc-200 transition mt-4"
            >
              {isSubmitting ? "Sending details..." : "Send delivery details to seller"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600">Door in Four • Trusted local delivery for West Kent marketplaces</p>
      </div>
    </main>
  );
}