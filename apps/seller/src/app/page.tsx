import Link from "next/link";

export default function PublicLanding() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="border-b border-emerald-300/20 bg-emerald-400/10 px-6 py-3 text-center text-sm font-bold text-emerald-100">
        Buyer quote flow v2 is live at <Link href="/buy" className="underline decoration-emerald-200 underline-offset-4">/buy</Link>
      </div>

      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] bg-[length:4px_4px] opacity-40"></div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-emerald-200">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
            Royal Tunbridge Wells & West Kent launch zone
          </div>

          <h1 className="mt-8 max-w-4xl text-6xl font-black tracking-tight leading-none">
            Marketplace logistics without the chaos.
          </h1>

          <p className="mt-6 max-w-2xl text-2xl text-zinc-400">
            Door in Four connects buyers, sellers and local drivers into one simple delivery flow.
          </p>

          <div className="mt-16 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
                Seller journey
              </div>

              <h2 className="text-4xl font-black tracking-tight">
                Selling something on Marketplace?
              </h2>

              <p className="mt-4 text-lg text-zinc-400">
                Create a private Door in Four delivery link and send it directly to your buyer.
              </p>

              <ul className="mt-8 space-y-3 text-sm text-zinc-300">
                <li>✓ Buyer enters delivery details securely</li>
                <li>✓ Seller keeps item payment separate</li>
                <li>✓ Local drivers handle collection and delivery</li>
              </ul>

              <Link
                href="/sell"
                className="mt-10 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-lg font-black text-black transition hover:bg-zinc-100"
              >
                Create delivery link
              </Link>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-8 backdrop-blur">
              <div className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                Buyer journey
              </div>

              <h2 className="text-4xl font-black tracking-tight text-white">
                Need something collected and delivered?
              </h2>

              <p className="mt-4 text-lg text-emerald-100/80">
                Enter pickup and delivery details, receive a quote instantly, then track your delivery live.
              </p>

              <ul className="mt-8 space-y-3 text-sm text-emerald-50/80">
                <li>✓ Instant quote generation</li>
                <li>✓ Secure Stripe payment</li>
                <li>✓ Live delivery progress tracking</li>
              </ul>

              <Link
                href="/buy"
                className="mt-10 inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-8 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-200"
              >
                Start buyer booking
              </Link>

              <p className="mt-4 text-sm font-semibold text-emerald-100/80">
                Direct test route: <Link href="/buy" className="underline decoration-emerald-200 underline-offset-4">/buy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Quote visibility",
              description: "Customers see and approve the delivery quote before payment."
            },
            {
              title: "Human dispatch support",
              description: "Our operations team helps keep deliveries moving during launch."
            },
            {
              title: "Live operational tracking",
              description: "Track jobs, drivers and delivery progress from one system."
            }
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-2xl font-black tracking-tight">{item.title}</h3>
              <p className="mt-4 text-zinc-400">{item.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-[11px] font-medium text-slate-700">
          Seller landing deploy marker: buyer quote flow v2
        </p>
      </section>
    </main>
  );
}
