import Link from "next/link";
import { supabase } from "@/lib/server";

export default async function BookingsPage({ searchParams }: { searchParams: { status?: string } }) {
  let query = supabase.from("bookings").select("id,status,payment_status,accepted_price,created_at,buyer_id,driver_id").order("created_at", { ascending: false }).limit(200);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: bookings } = await query;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <div className="flex gap-3">
        {[
          "paid_awaiting_dispatch",
          "driver_assigned",
          "driver_en_route_to_pickup",
          "delivered",
          "completed",
          "disputed"
        ].map((status) => (
          <Link key={status} href={`/bookings?status=${status}`} className="rounded border px-2 py-1 text-sm">
            {status}
          </Link>
        ))}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b"><th>ID</th><th>Status</th><th>Payment</th><th>Price</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {bookings?.map((booking) => (
            <tr key={booking.id} className="border-b">
              <td className="py-2">{booking.id.slice(0, 8)}...</td>
              <td>{booking.status}</td>
              <td>{booking.payment_status}</td>
              <td>£{booking.accepted_price}</td>
              <td><Link className="underline" href={`/bookings/${booking.id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
