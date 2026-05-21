import Link from "next/link";
import { supabase } from "@/lib/server";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

type QuoteRecord = {
  id: string;
  pickup_town?: string | null;
  delivery_town?: string | null;
  pickup_postcode?: string | null;
  delivery_postcode?: string | null;
  item_size?: string | null;
  approximate_weight_kg?: number | null;
  total_price?: number | null;
  status?: string | null;
  created_at?: string | null;
  item_summary?: string | null;
};

function parseItemSizeFromSummary(summary?: string | null) {
  if (!summary) return "—";
  return summary.split(" x")[0] || "—";
}

export default async function QuotesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchText = (params.q || "").trim();

  let query = supabase
    .from("quotes")
    .select(
      "id,pickup_town,delivery_town,pickup_postcode,delivery_postcode,item_size,approximate_weight_kg,total_price,status,created_at,item_summary"
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (searchText) {
    query = query.or(
      `id.ilike.%${searchText}%,pickup_town.ilike.%${searchText}%,delivery_town.ilike.%${searchText}%,pickup_postcode.ilike.%${searchText}%,delivery_postcode.ilike.%${searchText}%,status.ilike.%${searchText}%,item_summary.ilike.%${searchText}%`
    );
  }

  const { data, error } = await query;
  const quotes = (data ?? []) as QuoteRecord[];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Door in Four</p>
            <h1 className="text-4xl font-black tracking-tight">Quotes / Quote Query</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Search and review quote records created by the get-a-quote flow.</p>
          </div>
          <Link href="/" className="inline-flex h-fit items-center justify-center rounded-full bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400">Return home</Link>
        </div>

        <form className="mb-6" method="GET">
          <input
            type="text"
            name="q"
            defaultValue={searchText}
            placeholder="Search by ID, town, postcode, status or item"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
          />
        </form>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            Error loading quotes: {error.message}
          </div>
        ) : null}

        {!error && quotes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
            No quotes found.
          </div>
        ) : null}

        {!error && quotes.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Quote ID</th>
                    <th className="px-6 py-4">Pickup town</th>
                    <th className="px-6 py-4">Delivery town</th>
                    <th className="px-6 py-4">Item size</th>
                    <th className="px-6 py-4">Weight (kg)</th>
                    <th className="px-6 py-4">Total price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5 font-mono text-xs text-slate-700">{quote.id.slice(0, 8)}...</td>
                      <td className="px-6 py-5 text-slate-700">{quote.pickup_town ?? quote.pickup_postcode ?? "—"}</td>
                      <td className="px-6 py-5 text-slate-700">{quote.delivery_town ?? quote.delivery_postcode ?? "—"}</td>
                      <td className="px-6 py-5 text-slate-700">{quote.item_size ?? parseItemSizeFromSummary(quote.item_summary)}</td>
                      <td className="px-6 py-5 text-slate-700">{quote.approximate_weight_kg ?? "—"}</td>
                      <td className="px-6 py-5 font-semibold">£{Number(quote.total_price ?? 0).toFixed(2)}</td>
                      <td className="px-6 py-5"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">{quote.status ?? "unknown"}</span></td>
                      <td className="px-6 py-5 text-slate-500">{quote.created_at ? new Date(quote.created_at).toLocaleDateString("en-GB") : "Unknown"}</td>
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
