import Link from "next/link";

const itemTypes = [
  "Small parcel",
  "Medium box",
  "Furniture item",
  "Marketplace pickup",
  "Van load"
];

const steps = [
  "Tell us pickup and delivery postcodes",
  "Describe the item and access details",
  "Choose urgency and preferred time",
  "Get a guide price and submit the request"
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

          <div className="rounded-3xl border border-white/15 bg-white p-6 text-slate-950 shadow-2xl shadow-black/40">
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Quote request</p>
              <h2 className="mt-2 text-3xl font-black">Start your delivery</h2>
              <p className="mt-2 text-sm text-slate-600">
                This is the customer-facing quote form shell. Next step is wiring it to Supabase and payments.
              </p>
            </div>

            <form className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Pickup postcode</span>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="TN1 1AA" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Delivery postcode</span>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="TN4 8AB" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">What are we moving?</span>
                <select className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" defaultValue="">
                  <option value="" disabled>Select item type</option>
                  {itemTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Urgency</span>
                  <select className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" defaultValue="scheduled">
                    <option value="flexible">Flexible</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="same_day">Same day</option>
                    <option value="asap">ASAP</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Access notes</span>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="Stairs, lift, parking..." />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Extra details</span>
                <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="Describe the item, seller arrangements, preferred time window..." />
              </label>

              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-950">Guide price preview</p>
                <p className="mt-1">Pricing engine connection comes next. This form is ready for wiring.</p>
              </div>

              <button
                type="button"
                className="w-full rounded-full bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500"
              >
                Request quote
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
