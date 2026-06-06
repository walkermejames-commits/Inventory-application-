import Link from "next/link";

export default function TrackLandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-zinc-400 transition hover:text-white">
          ← Back to Door in Four
        </Link>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 sm:p-10">
          <div className="mb-5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
            Delivery tracking
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Track your Door in Four delivery
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-300">
            Your private tracking link is sent after a delivery is booked and paid. It usually looks like a direct Door in Four link from the seller, buyer flow, or confirmation page.
          </p>

          <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-300">
            <p>
              <span className="font-black text-white">Already have a tracking link?</span> Open that exact link from your message or confirmation screen.
            </p>
            <p>
              <span className="font-black text-white">Lost the link?</span> Contact the seller or Door in Four support with the booking details used at checkout.
            </p>
            <p>
              <span className="font-black text-white">Waiting for a quote?</span> The tracking page becomes available after the delivery is confirmed.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/buy"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-6 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-200"
            >
              Start a delivery quote
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white transition hover:bg-white/15"
            >
              Return home
            </Link>
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] font-medium text-slate-700">
          Tracking landing page v1
        </p>
      </div>
    </main>
  );
}
