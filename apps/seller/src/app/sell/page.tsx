"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateDeliveryLink() {
  const [form, setForm] = useState({
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    itemTitle: "",
    itemSize: "medium",
    approximateWeightKg: 10,
    pickupTown: "Royal Tunbridge Wells",
    pickupPostcode: "",
    pickupAddress: "",
    preferredPickupWindows: "",
    fragile: false,
    needsTwoPeople: false,
    needsVan: false,
    itemPaymentConfirmed: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ buyerLink: string; messengerText: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemPaymentConfirmed) {
      alert("Please confirm that item payment is handled separately.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/sell/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");

      setResult({
        buyerLink: data.buyerLink,
        messengerText: data.messengerText,
      });
    } catch (err: any) {
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-8">
            <Link href="/" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
              ← Back to home
            </Link>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">✓</div>
              <h1 className="text-3xl font-semibold tracking-tight">Delivery link created</h1>
            </div>

            <div className="space-y-8">
              <div>
                <div className="text-sm text-zinc-400 mb-2">PRIVATE BUYER LINK</div>
                <div className="bg-black p-5 rounded-2xl font-mono text-sm break-all border border-white/10">
                  {result.buyerLink}
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(result.buyerLink)}
                  className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
                >
                  📋 Copy link
                </button>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-2">COPY INTO FACEBOOK MESSENGER</div>
                <textarea 
                  readOnly 
                  value={result.messengerText} 
                  className="w-full h-36 bg-black p-5 rounded-2xl text-sm font-mono border border-white/10 resize-none"
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(result.messengerText)}
                  className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
                >
                  📋 Copy message
                </button>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 text-sm text-zinc-400">
              The buyer will receive this link and add their delivery details. You'll be notified to confirm and pay for delivery.
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white py-12">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-10">
          <Link href="/" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm mb-4">
            ← Back
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight">Create delivery link</h1>
          <p className="text-xl text-zinc-400 mt-3">Your buyer will use this link to add their delivery details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 bg-zinc-900 border border-white/10 rounded-3xl p-10">
          <div>
            <div className="uppercase text-xs tracking-[1.5px] text-zinc-500 mb-4">YOUR DETAILS</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Full name</label>
                <input type="text" value={form.sellerName} onChange={(e) => setForm({...form, sellerName: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" required />
              </div>
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Email</label>
                <input type="email" value={form.sellerEmail} onChange={(e) => setForm({...form, sellerEmail: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" required />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm mb-2 text-zinc-400">Phone (optional)</label>
              <input type="tel" value={form.sellerPhone} onChange={(e) => setForm({...form, sellerPhone: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" />
            </div>
          </div>

          <div>
            <div className="uppercase text-xs tracking-[1.5px] text-zinc-500 mb-4">ITEM DETAILS</div>
            <div>
              <label className="block text-sm mb-2 text-zinc-400">Item title / description</label>
              <input type="text" value={form.itemTitle} onChange={(e) => setForm({...form, itemTitle: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-white/40" required />
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Size</label>
                <select value={form.itemSize} onChange={(e) => setForm({...form, itemSize: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="furniture">Furniture</option>
                  <option value="van_load">Van load</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Approx weight (kg)</label>
                <input type="number" value={form.approximateWeightKg} onChange={(e) => setForm({...form, approximateWeightKg: parseInt(e.target.value)})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" />
              </div>
            </div>
          </div>

          <div>
            <div className="uppercase text-xs tracking-[1.5px] text-zinc-500 mb-4">PICKUP LOCATION</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Town</label>
                <input type="text" value={form.pickupTown} onChange={(e) => setForm({...form, pickupTown: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" required />
              </div>
              <div>
                <label className="block text-sm mb-2 text-zinc-400">Postcode</label>
                <input type="text" value={form.pickupPostcode} onChange={(e) => setForm({...form, pickupPostcode: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" required />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm mb-2 text-zinc-400">Address line (optional)</label>
              <input type="text" value={form.pickupAddress} onChange={(e) => setForm({...form, pickupAddress: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5" />
            </div>
          </div>

          <div>
            <div className="uppercase text-xs tracking-[1.5px] text-zinc-500 mb-4">PREFERENCES</div>
            <div>
              <label className="block text-sm mb-2 text-zinc-400">Preferred pickup windows</label>
              <textarea value={form.preferredPickupWindows} onChange={(e) => setForm({...form, preferredPickupWindows: e.target.value})} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-3.5 h-20" placeholder="e.g. Tomorrow 2-5pm or Wednesday morning" />
            </div>

            <div className="mt-6 space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.fragile} onChange={(e) => setForm({...form, fragile: e.target.checked})} className="accent-white" />
                <span>Fragile item — handle with care</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.needsTwoPeople} onChange={(e) => setForm({...form, needsTwoPeople: e.target.checked})} className="accent-white" />
                <span>Requires two people to carry</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.needsVan} onChange={(e) => setForm({...form, needsVan: e.target.checked})} className="accent-white" />
                <span>Needs a van (large item)</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <label className="flex items-start gap-4 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.itemPaymentConfirmed} 
                onChange={(e) => setForm({...form, itemPaymentConfirmed: e.target.checked})} 
                className="mt-1 accent-white w-5 h-5" 
                required 
              />
              <div className="text-sm leading-snug text-zinc-400">
                I confirm that the buyer will pay (or has paid) me directly for the item. Door in Four is only being paid for delivery.
              </div>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !form.itemPaymentConfirmed}
            className="w-full py-4 bg-white text-black rounded-2xl font-semibold text-lg disabled:opacity-60 hover:bg-zinc-100 active:bg-zinc-200 transition mt-4"
          >
            {isSubmitting ? "Creating secure link..." : "Create private buyer link"}
          </button>
        </form>
      </div>
    </main>
  );
}