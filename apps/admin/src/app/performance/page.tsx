import Link from "next/link";
import { supabase } from "@/lib/server";

export default async function PerformancePage() {
  const [quotesResult, bookingsResult] = await Promise.all([
    supabase.from("quotes").select("id,total_price", { count: "exact" }),
    supabase.from("bookings").select("id,accepted_price", { count: "exact" })
  ]);

  const totalQuotes = quotesResult.count ?? 0;
  const totalBookings = bookingsResult.count ?? 0;
  const estimatedRevenue = (bookingsResult.data ?? []).reduce((sum, booking) => sum + Number(booking.accepted_price ?? 0), 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Door in Four</p>
            <h1 className="text-4xl font-black tracking-tight">Performance</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Lightweight dashboard snapshot for launch operations.</p>
          </div>
          <Link href="/" className="inline-flex h-fit items-center justify-center rounded-full bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400">Return home</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Total quotes</p>
            <p className="mt-2 text-3xl font-black">{totalQuotes}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Total bookings</p>
            <p className="mt-2 text-3xl font-black">{totalBookings}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Estimated revenue</p>
            <p className="mt-2 text-3xl font-black">£{estimatedRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-6 text-violet-900">
          <p className="text-sm font-bold">Coming next: driver utilisation, conversion rate, quote-to-booking funnel</p>
        </div>
      </div>
    </main>
  );
}
