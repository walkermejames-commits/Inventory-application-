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
    pickupTown: "",
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
      alert("Please confirm that item payment is handled separately between you and the buyer.");
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
      alert(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8 max-w-2xl mx-auto">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">Delivery link created!</h1>
          
          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">
            <p className="font-medium">Send this private link to your buyer:</p>
            <div className="bg-black p-4 rounded-xl font-mono text-sm break-all">
              {result.buyerLink}
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(result.buyerLink)}
              className="text-sm underline"
            >
              Copy link
            </button>
          </div>

          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">
            <p className="font-medium">Copy & paste into Facebook Messenger:</p>
            <textarea 
              readOnly 
              value={result.messengerText} 
              className="w-full h-32 bg-black p-4 rounded-xl text-sm font-mono"
            />
            <button 
              onClick={() => navigator.clipboard.writeText(result.messengerText)}
              className="text-sm underline"
            >
              Copy message
            </button>
          </div>

          <div className="text-sm text-zinc-400">
            The buyer will add their delivery details. You'll then confirm and pay for delivery.
          </div>

          <Link href="/sell" className="inline-block mt-4 text-zinc-400 hover:text-white">Create another link →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 max-w-2xl mx-auto">
      <div className="space-y-8">
        <div>
          <Link href="/" className="text-zinc-400 hover:text-white">← Back</Link>
          <h1 className="text-3xl font-bold mt-4">Create delivery link</h1>
          <p className="text-zinc-400 mt-2">Fill in the details. We'll generate a private link for your buyer.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 p-8 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-1.5">Your name</label>
              <input 
                type="text" 
                value={form.sellerName} 
                onChange={(e) => setForm({...form, sellerName: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Email</label>
              <input 
                type="email" 
                value={form.sellerEmail} 
                onChange={(e) => setForm({...form, sellerEmail: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5">Phone (optional)</label>
            <input 
              type="tel" 
              value={form.sellerPhone} 
              onChange={(e) => setForm({...form, sellerPhone: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">Item title / description</label>
            <input 
              type="text" 
              value={form.itemTitle} 
              onChange={(e) => setForm({...form, itemTitle: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Item size</label>
              <select 
                value={form.itemSize} 
                onChange={(e) => setForm({...form, itemSize: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="furniture">Furniture</option>
                <option value="van_load">Van load</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">Approx weight (kg)</label>
              <input 
                type="number" 
                value={form.approximateWeightKg} 
                onChange={(e) => setForm({...form, approximateWeightKg: parseInt(e.target.value)})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">Pickup town</label>
              <input 
                type="text" 
                value={form.pickupTown} 
                onChange={(e) => setForm({...form, pickupTown: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5">Pickup postcode</label>
              <input 
                type="text" 
                value={form.pickupPostcode} 
                onChange={(e) => setForm({...form, pickupPostcode: e.target.value})} 
                className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5">Pickup address (optional)</label>
            <input 
              type="text" 
              value={form.pickupAddress} 
              onChange={(e) => setForm({...form, pickupAddress: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3" 
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">Preferred pickup windows (e.g. "Tomorrow 2-5pm, Wed 9am-12pm")</label>
            <textarea 
              value={form.preferredPickupWindows} 
              onChange={(e) => setForm({...form, preferredPickupWindows: e.target.value})} 
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 h-20" 
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.fragile} onChange={(e) => setForm({...form, fragile: e.target.checked})} className="w-5 h-5" />
              <span>Fragile item</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.needsTwoPeople} onChange={(e) => setForm({...form, needsTwoPeople: e.target.checked})} className="w-5 h-5" />
              <span>Needs two people</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.needsVan} onChange={(e) => setForm({...form, needsVan: e.target.checked})} className="w-5 h-5" />
              <span>Needs van</span>
            </label>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <label className="flex items-start gap-3">
              <input 
                type="checkbox" 
                checked={form.itemPaymentConfirmed} 
                onChange={(e) => setForm({...form, itemPaymentConfirmed: e.target.checked})} 
                className="mt-1 w-5 h-5" 
                required 
              />
              <span className="text-sm">
                I confirm that the buyer will pay (or has paid) me directly for the item. 
                Door in Four is only being paid for delivery.
              </span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !form.itemPaymentConfirmed}
            className="w-full bg-white text-black py-4 rounded-xl font-semibold disabled:opacity-50 mt-6"
          >
            {isSubmitting ? "Creating link..." : "Create private buyer link"}
          </button>
        </form>
      </div>
    </main>
  );
}