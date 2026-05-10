import Link from "next/link";

const requirements = [
  "Your own vehicle or regular access to one",
  "Valid driving licence and insurance",
  "Comfortable collecting marketplace items",
  "Able to communicate clearly with buyers and sellers",
  "Local knowledge around Tunbridge Wells and nearby towns"
];

const steps = [
  "Tell us about you and your vehicle",
  "Choose your normal working area",
  "Submit your basic driver details",
  "Admin reviews and activates your profile"
];

export default function DriverSignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <nav className="mb-10 flex items-center justify-between">
          <Link href="/" className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">
            Door in Four
          </Link>
          <div className="flex gap-3">
            <Link href="/get-a-quote" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
              Get a quote
            </Link>
            <Link href="/bookings" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">
              Admin
            </Link>
          </div>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="pt-8">
            <div className="mb-6 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
              Driver onboarding · Tunbridge Wells launch fleet
            </div>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
              Become a Door in Four driver.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Join a local collection and delivery network built for marketplace pickups, small moves and urgent local jobs.
              Start with simple scheduled work, clear payout estimates and admin-reviewed dispatch.
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
              <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Driver application</p>
              <h2 className="mt-2 text-3xl font-black">Register interest</h2>
              <p className="mt-2 text-sm text-slate-600">
                This creates a clean onboarding front door. The next step is wiring submissions into Supabase driver_profiles.
              </p>
            </div>

            <form className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Full name</span>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="Your name" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Phone number</span>
                  <input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="07..." />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input type="email" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="you@example.com" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Vehicle type</span>
                  <select className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" defaultValue="car">
                    <option value="car">Car</option>
                    <option value="estate">Estate car</option>
                    <option value="small_van">Small van</option>
                    <option value="medium_van">Medium van</option>
                    <option value="large_van">Large van</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Service radius</span>
                  <select className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" defaultValue="10">
                    <option value="5">Up to 5 miles</option>
                    <option value="10">Up to 10 miles</option>
                    <option value="20">Up to 20 miles</option>
                    <option value="30">Up to 30 miles</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Normal base town</span>
                <input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="Tunbridge Wells" defaultValue="Tunbridge Wells" />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Availability notes</span>
                <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2" placeholder="Weekends, evenings, weekdays, short notice jobs..." />
              </label>

              <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-950">Before approval</p>
                <ul className="mt-2 space-y-1">
                  {requirements.map((requirement) => <li key={requirement}>• {requirement}</li>)}
                </ul>
              </div>

              <button type="button" className="w-full rounded-full bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500">
                Submit driver interest
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
