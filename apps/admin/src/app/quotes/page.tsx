import Link from "next/link";
import { supabase } from "@/lib/server";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

type QuoteRow = {
  id: string;
  source: "quote" | "booking";
  pickup_postcode?: string | null;
  delivery_postcode?: string | null;
  pickup_town?: string | null;
  delivery_town?: string | null;
  route_distance_miles?: number | null;
  route_duration_minutes?: number | null;
  item_summary?: string | null;
  total_price?: number | null;
  driver_payout_estimate?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type BookingRecord = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  item_title?: string | null;
  item_size?: string | null;
  approximate_weight_kg?: number | null;
  delivery_quote_amount?: number | null;
  driver_payout_amount?: number | null;
  route_distance_miles?: number | null;
  route_duration_minutes?: number | null;
  created_at?: string | null;
  pickup_contacts?: { town?: string | null; postcode?: string | null } | null;
  delivery_addresses?: { town?: string | null; postcode?: string | null } | null;
};

function formatMoney(value?: number | null) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function normalise(value?: string | null) {
  return (value || "").toLowerCase();
}

function matchesSearch(row: QuoteRow, searchText: string) {
  if (!searchText) return true;
  const haystack = [
    row.id,
    row.pickup_postcode,
    row.delivery_postcode,
    row.pickup_town,
    row.delivery_town,
    row.item_summary,
    row.status,
    row.source,
  ].map(normalise).join(" ");

  return haystack.includes(searchText.toLowerCase());
}

export default async function QuotesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchText = (params.q || "").trim();

  const [quotesResult, bookingsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,pickup_postcode,delivery_postcode,route_distance_miles,route_duration_minutes,item_summary,total_price,driver_payout_estimate,status,created_at")
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("bookings")
      .select(`
        id,status,payment_status,item_title,item_size,approximate_weight_kg,delivery_quote_amount,driver_payout_amount,route_distance_miles,route_duration_minutes,created_at,
        pickup_contacts (town, postcode),
        delivery_addresses (town, postcode)
      `)
      .not("delivery_quote_amount", "is", null)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const oldQuoteRows: QuoteRow[] = (quotesResult.data ?? []).map((quote: any) => ({
    id: quote.id,
    source: "quote",
    pickup_postcode: quote.pickup_postcode,
    delivery_postcode: quote.delivery_postcode,
    route_distance_miles: quote.route_distance_miles,
    route_duration_minutes: quote.route_duration_minutes,
    item_summary: quote.item_summary,
    total_price: quote.total_price,
    driver_payout_estimate: quote.driver_payout_estimate,
    status: quote.status,
    created_at: quote.created_at,
  }));

  const bookingRows: QuoteRow[] = ((bookingsResult.data ?? []) as BookingRecord[]).map((booking) => {
    const pickup = Array.isArray(booking.pickup_contacts) ? booking.pickup_contacts[0] : booking.pickup_contacts;
    const delivery = Array.isArray(booking.delivery_addresses) ? booking.delivery_addresses[0] : booking.delivery_addresses;

    return {
      id: booking.id,
      source: "booking",
      pickup_postcode: pickup?.postcode,
      delivery_postcode: delivery?.postcode,
      pickup_town: pickup?.town,
      delivery_town: delivery?.town,
      route_distance_miles: booking.route_distance_miles,
      route_duration_minutes: booking.route_duration_minutes,
      item_summary: [booking.item_title, booking.item_size, booking.approximate_weight_kg ? `${booking.approximate_weight_kg}kg` : null]
        .filter(Boolean)
        .join(" · "),
      total_price: booking.delivery_quote_amount,
      driver_payout_estimate: booking.driver_payout_amount,
      status: booking.status || booking.payment_status,
      created_at: booking.created_at,
    };
  });

  const combinedRows = [...bookingRows, ...oldQuoteRows]
    .filter((row) => matchesSearch(row, searchText))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const error = quotesResult.error || bookingsResult.error;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Door in Four · FC</p>
            <h1 className="text-4xl font-black tracking-tight">Quotes / Quote Query</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Search quote records from both legacy quotes and live booking flows.</p>
          </div>
          <Link href="/" className="inline-flex h-fit items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">Return to FC</Link>
        </div>

        <form className="mb-6" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={searchText}
            placeholder="Search by ID, town, postcode, status or item"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </form>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            Error loading quotes: {error.message}
          </div>
        ) : null}

        {!error && combinedRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
            No quotes found.
          </div>
        ) : null}

        {!error && combinedRows.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Pickup</th>
                    <th className="px-6 py-4">Delivery</th>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Total price</th>
                    <th className="px-6 py-4">Driver estimate</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {combinedRows.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{row.source}</span></td>
                      <td className="px-6 py-5 font-mono text-xs text-slate-700">{row.id.slice(0, 8)}...</td>
                      <td className="px-6 py-5 text-slate-700">{row.pickup_town || row.pickup_postcode || "—"}</td>
                      <td className="px-6 py-5 text-slate-700">{row.delivery_town || row.delivery_postcode || "—"}</td>
                      <td className="px-6 py-5 text-slate-700">{row.item_summary || "—"}</td>
                      <td className="px-6 py-5 text-slate-700">
                        {Number(row.route_distance_miles ?? 0).toFixed(1)} mi · {Number(row.route_duration_minutes ?? 0).toFixed(0)} min
                      </td>
                      <td className="px-6 py-5 font-semibold">{formatMoney(row.total_price)}</td>
                      <td className="px-6 py-5 text-slate-700">{formatMoney(row.driver_payout_estimate)}</td>
                      <td className="px-6 py-5"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{row.status ?? "unknown"}</span></td>
                      <td className="px-6 py-5 text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString("en-GB") : "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
