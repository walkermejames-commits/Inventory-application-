import Link from "next/link";

export default function SellerLanding() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] bg-[length:4px_4px] opacity-50"></div>
        
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-sm mb-6">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              Now serving Royal Tunbridge Wells & West Kent
            </div>

            <h1 className="text-6xl font-semibold tracking-tighter leading-none mb-6">
              Marketplace delivery,<br />made civilised.
            </h1>
            
            <p className="text-2xl text-zinc-400 max-w-xl mb-10">
              Send your buyer a private Door in Four link. They add delivery details. You pay only for delivery.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/sell" 
                className="inline-flex items-center justify-center px-10 py-4 bg-white text-black rounded-2xl font-semibold text-lg hover:bg-zinc-100 transition-all active:scale-[0.985]"
              >
                Create delivery link
              </Link>
              
              <Link 
                href="/collect" 
                className="inline-flex items-center justify-center px-10 py-4 border border-white/30 hover:bg-white/5 rounded-2xl font-medium text-lg transition-all"
              >
                Track a collection
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center mb-16">
          <div className="text-emerald-400 text-sm font-medium tracking-[2px] mb-3">3 SIMPLE STEPS</div>
          <h2 className="text-4xl font-semibold tracking-tight">How Door in Four works for sellers</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[ 
            { step: "1", title: "Create a link", desc: "Fill in item and pickup details. We generate a private link for your buyer." },
            { step: "2", title: "Buyer adds delivery info", desc: "They enter their address and preferred time. Item payment stays between you two." },
            { step: "3", title: "Confirm & pay for delivery", desc: "You confirm the quote and pay Door in Four. Driver is assigned automatically." }
          ].map((item, index) => (
            <div key={index} className="bg-zinc-900/80 border border-white/10 rounded-3xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-semibold mb-8">{item.step}</div>
              <h3 className="text-2xl font-semibold tracking-tight mb-4">{item.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust section */}
      <div className="bg-zinc-900/50 border-t border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-lg text-zinc-400 max-w-md mx-auto">
            Door in Four only charges for delivery. The buyer pays you directly for the item — exactly like a normal Marketplace sale.
          </p>
          <div className="mt-8 flex justify-center gap-8 text-sm text-zinc-500">
            <div>✓ No escrow</div>
            <div>✓ No item payment handling</div>
            <div>✓ Local West Kent drivers</div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/10 py-12">
        <div className="max-w-md mx-auto text-center px-6">
          <p className="text-zinc-400 mb-6">Ready to offer delivery on your next Marketplace sale?</p>
          <Link 
            href="/sell" 
            className="inline-block px-8 py-3.5 bg-white text-black rounded-2xl font-semibold hover:bg-zinc-100 transition"
          >
            Create your first delivery link
          </Link>
        </div>
      </div>
    </main>
  );
}