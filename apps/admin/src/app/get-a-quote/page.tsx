import Link from "next/link";
import QuoteForm from "./QuoteForm";

const steps = [
  "Tell us pickup and delivery postcodes",
  "Describe the item and access details",
  "Choose urgency and preferred time",
  "Get a live price and create the booking quote"
];

export default function GetAQuotePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <nav className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">
            Door in Four
          </Link>
          <Link
            href="/bookings"
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
          >
            Admin
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="pt-8">
            <div className="mb-6 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
              Local collection and delivery · Tunbridge Wells launch area
            </div>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
              Get a local delivery quote without the faff.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Door in Four helps buyers, sellers and drivers coordinate marketplace pickups,
              furniture moves and same-day local deliveries with clear pricing and simple handover checks.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-black text-violet-200">0{index + 1}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <QuoteForm />
        </div>
      </section>
    </main>
  );
}
