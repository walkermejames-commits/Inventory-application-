import Link from "next/link";
import { supabase } from "@/lib/server";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

const statuses = [
  "paid_awaiting_dispatch",
  "driver_assigned",
  "driver_en_route_to_pickup",
  "delivered",
  "completed",
  "disputed"
];

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  let query = supabase
    .from("bookings")
    .select("id,status,payment_status,accepted_price,created_at,buyer_id,driver_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data: bookings } = await query;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
              Door in Four
            </p>
            <h1 className="text-4xl font-black tracking-tight">Bookings Dashboard</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Dispatch coordination, booking review and payment tracking for the local delivery network.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex h-fit items-center justify-center rounded-full bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
          >
            Return home
          </Link>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {statuses.map((status) => (
            <Link
              key={status}
              href={`/bookings?status=${status}`}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-400 hover:text-violet-700"
            >
              {status.replaceAll("_", " ")}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Booking</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {bookings?.map((booking) => (
                  <tr key={booking.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-5 font-mono text-xs text-slate-700">
                      {booking.id.slice(0, 8)}...
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                        {booking.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-slate-600">
                      {booking.payment_status || "pending"}
                    </td>

                    <td className="px-6 py-5 font-semibold">
                      £{booking.accepted_price || 0}
                    </td>

                    <td className="px-6 py-5 text-slate-500">
                      {booking.created_at
                        ? new Date(booking.created_at).toLocaleDateString("en-GB")
                        : "Unknown"}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-600"
                      >
                        Open booking
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
