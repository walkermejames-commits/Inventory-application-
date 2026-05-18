import Link from "next/link";

export default function SellerLanding() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 max-w-2xl mx-auto">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Door in Four</h1>
          <p className="text-xl text-zinc-400 mt-2">Local delivery for Marketplace sellers</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold">Sold something locally?</h2>
          <p className="text-zinc-300">
            Offer same-day or scheduled delivery through Door in Four. 
            The buyer pays you directly for the item — we only charge for delivery.
          </p>

          <div className="space-y-4 pt-4">
            <Link 
              href="/sell" 
              className="block w-full bg-white text-black py-4 rounded-xl text-center font-semibold text-lg hover:bg-zinc-200 transition"
            >
              Create delivery link for buyer
            </Link>

            <Link 
              href="/collect" 
              className="block w-full border border-zinc-700 py-4 rounded-xl text-center font-medium hover:bg-zinc-900 transition"
            >
              Track existing collection
            </Link>
          </div>
        </div>

        <div className="text-sm text-zinc-500">
          Private link sent via Facebook Messenger or text. Buyer adds delivery details. You pay only for delivery.
        </div>
      </div>
    </main>
  );
}