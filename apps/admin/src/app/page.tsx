import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="mb-8 inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-violet-100">
          Door in Four · Tunbridge Wells launch control
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
              Dispatch, bookings and delivery ops in one clean cockpit.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              A practical admin dashboard for managing local collections, driver assignment,
              payments, status changes and launch-zone logistics.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/bookings"
                className="rounded-full bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-400"
              >
                Open bookings
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <h2 className="text-lg font-bold">Launch checklist</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-200">
              {[
                "Review paid bookings",
                "Assign available driver",
                "Track pickup and delivery status",
                "Check disputes and notes",
                "Prepare payout records"
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
