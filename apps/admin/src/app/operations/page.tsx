import Link from "next/link";
import { supabase } from "@/lib/server";

type SearchParams = {
  status?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type BookingRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  accepted_price: number | null;
  delivery_quote_amount: number | null;
  driver_payout_amount: number | null;
  route_distance_miles: number | null;
  route_duration_minutes: number | null;
  eta_minutes?: number | null;
  item_title: string | null;
  item_size: string | null;
  approximate_weight_kg: number | null;
  fragile: boolean | null;
  requires_two_people: boolean | null;
  requires_van: boolean | null;
  driver_id: string | null;
  buyer_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  pickup_contacts?: {
    seller_name?: string | null;
    seller_phone?: string | null;
    seller_email?: string | null;
    town?: string | null;
    postcode?: string | null;
    address_line_1?: string | null;
    address_line?: string | null;
  } | null;
  delivery_addresses?: {
    recipient_name?: string | null;
    recipient_phone?: string | null;
    buyer_name?: string | null;
    buyer_phone?: string | null;
    buyer_email?: string | null;
    town?: string | null;
    postcode?: string | null;
    address_line_1?: string | null;
    address_line?: string | null;
  } | null;
};

type DriverProfile = {
  id: string;
  user_id: string | null;
  status: string | null;
  current_availability: boolean | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

const activeStatuses = [
  "quote_created",
  "awaiting_payment",
  "seller_quote_pending",
  "paid_awaiting_dispatch",
  "driver_assigned",
  "driver_en_route_to_pickup",
  "driver_arrived_at_pickup",
  "pickup_verified",
  "item_collected",
  "driver_en_route_to_delivery",
  "driver_arrived_at_delivery",
  "delivery_verified",
  "delivered",
  "completed",
  "disputed",
];

function money(value?: number | null) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function statusLabel(value?: string | null) {
  return (value || "unknown").replaceAll("_", " ");
}

function statusClass(value?: string | null) {
  if (!value) return "bg-slate-100 text-slate-700";
  if (value.includes("paid") || value.includes("driver") || value.includes("collected")) return "bg-emerald-100 text-emerald-800";
  if (value.includes("awaiting") || value.includes("pending") || value.includes("quote")) return "bg-amber-100 text-amber-800";
  if (value.includes("delivered") || value.includes("completed")) return "bg-blue-100 text-blue-800";
  if (value.includes("disputed") || value.includes("failed") || value.includes("cancelled")) return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function paymentClass(value?: string | null) {
  const status = value || "unknown";
  if (status.includes("paid") || status.includes("succeeded")) return "bg-emerald-100 text-emerald-800";
  if (status.includes("refund")) return "bg-red-100 text-red-800";
  if (status.includes("quote") || status.includes("pending") || status.includes("awaiting")) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function getPickup(row: BookingRow) {
  const pickup = Array.isArray(row.pickup_contacts) ? row.pickup_contacts[0] : row.pickup_contacts;
  return pickup || null;
}

function getDelivery(row: BookingRow) {
  const delivery = Array.isArray(row.delivery_addresses) ? row.delivery_addresses[0] : row.delivery_addresses;
  return delivery || null;
}

function compactDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "Unknown";
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedStatus = params.status || "active";

  let bookingsQuery = supabase
    .from("bookings")
    .select(`
      id,status,payment_status,accepted_price,delivery_quote_amount,driver_payout_amount,route_distance_miles,route_duration_minutes,item_title,item_size,approximate_weight_kg,fragile,requires_two_people,requires_van,driver_id,buyer_id,created_at,updated_at,
      pickup_contacts (seller_name, seller_phone, seller_email, town, postcode, address_line_1, address_line),
      delivery_addresses (recipient_name, recipient_phone, buyer_name, buyer_phone, buyer_email, town, postcode, address_line_1, address_line)
    `)
    .order("created_at", { ascending: false })
    .limit(150);

  if (selectedStatus === "active") {
    bookingsQuery = bookingsQuery.in("status", activeStatuses);
  } else if (selectedStatus !== "all") {
    bookingsQuery = bookingsQuery.eq("status", selectedStatus);
  }

  const [bookingsResult, driversResult, usersResult] = await Promise.all([
    bookingsQuery,
    supabase.from("driver_profiles").select("id,user_id,status,current_availability"),
    supabase.from("users").select("id,full_name,email,phone"),
  ]);

  const bookings = (bookingsResult.data ?? []) as BookingRow[];
  const drivers = (driversResult.data ?? []) as DriverProfile[];
  const users = (usersResult.data ?? []) as UserRow[];
  const error = bookingsResult.error || driversResult.error || usersResult.error;

  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const userById = new Map(users.map((user) => [user.id, user]));

  const totalValue = bookings.reduce((sum, booking) => sum + Number(booking.accepted_price ?? booking.delivery_quote_amount ?? 0), 0);
  const paidCount = bookings.filter((booking) => (booking.payment_status || "").includes("paid") || booking.status === "paid_awaiting_dispatch").length;
  const assignedCount = bookings.filter((booking) => booking.driver_id).length;
  const unassignedPaidCount = bookings.filter((booking) => booking.status === "paid_awaiting_dispatch" && !booking.driver_id).length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Door in Four · FC</p>
            <h1 className="text-4xl font-black tracking-tight">Live Operations</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Canonical booking view for status, driver, ETA, payment, route and customer contact. Bookings are the operational truth; quote attempts stay separate for funnel intelligence.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dispatch" className="inline-flex h-fit items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">
              Open dispatch
            </Link>
            <Link href="/" className="inline-flex h-fit items-center justify-center rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20">
              Return to FC
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Visible bookings</p>
            <p className="mt-2 text-3xl font-black">{bookings.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Paid / payment-ready</p>
            <p className="mt-2 text-3xl font-black">{paidCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned drivers</p>
            <p className="mt-2 text-3xl font-black">{assignedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Unassigned paid</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{unassignedPaidCount}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {[
            ["active", "Active"],
            ["all", "All"],
            ["quote_created", "Quote created"],
            ["seller_quote_pending", "Seller quote pending"],
            ["awaiting_payment", "Awaiting payment"],
            ["paid_awaiting_dispatch", "Paid awaiting dispatch"],
            ["driver_assigned", "Driver assigned"],
            ["driver_en_route_to_pickup", "En route pickup"],
            ["item_collected", "Collected"],
            ["driver_en_route_to_delivery", "En route delivery"],
            ["delivered", "Delivered"],
          ].map(([status, label]) => (
            <Link
              key={status}
              href={`/operations?status=${status}`}
              className={`rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition ${selectedStatus === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700"}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            Error loading operations board: {error.message}
          </div>
        ) : null}

        {!error && bookings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            No bookings found for this view.
          </div>
        ) : null}

        {!error && bookings.length > 0 ? (
          <div className="grid gap-5">
            {bookings.map((booking) => {
              const pickup = getPickup(booking);
              const delivery = getDelivery(booking);
              const driver = booking.driver_id ? driverById.get(booking.driver_id) : null;
              const driverUser = driver?.user_id ? userById.get(driver.user_id) : null;
              const routeMinutes = Number(booking.route_duration_minutes ?? 0);
              const etaMinutes = booking.status?.includes("driver") || booking.status?.includes("collected") ? routeMinutes : null;
              const customerName = delivery?.recipient_name || delivery?.buyer_name || pickup?.seller_name || "Unknown customer";
              const customerPhone = delivery?.recipient_phone || delivery?.buyer_phone || pickup?.seller_phone || "No phone";
              const price = booking.accepted_price ?? booking.delivery_quote_amount;

              return (
                <section key={booking.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                  <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(booking.status)}`}>
                              {statusLabel(booking.status)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${paymentClass(booking.payment_status)}`}>
                              {statusLabel(booking.payment_status || "payment unknown")}
                            </span>
                            {booking.requires_van ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">Van</span> : null}
                            {booking.requires_two_people ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">2-person</span> : null}
                            {booking.fragile ? <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-800">Fragile</span> : null}
                          </div>

                          <h2 className="mt-4 text-2xl font-black tracking-tight">
                            {pickup?.town || pickup?.postcode || "Pickup"} → {delivery?.town || delivery?.postcode || "Delivery"}
                          </h2>

                          <p className="mt-2 text-sm text-slate-500">
                            {booking.item_title || "Delivery job"} · {booking.item_size || "item"} · {Number(booking.approximate_weight_kg ?? 0).toFixed(0)}kg
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Booking value</p>
                          <p className="text-3xl font-black">{money(price)}</p>
                          <p className="mt-1 text-xs text-slate-500">Payout est. {money(booking.driver_payout_amount)}</p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer</p>
                          <p className="mt-2 font-black">{customerName}</p>
                          <p className="mt-1 text-sm text-slate-600">{customerPhone}</p>
                          <p className="mt-1 text-xs text-slate-500">{delivery?.buyer_email || pickup?.seller_email || "No email"}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Driver</p>
                          <p className="mt-2 font-black">{driverUser?.full_name || "Unassigned"}</p>
                          <p className="mt-1 text-sm text-slate-600">{driverUser?.phone || "No driver phone"}</p>
                          <p className="mt-1 text-xs text-slate-500">{driver?.current_availability ? "Available" : driver ? "Unavailable" : "Needs dispatch"}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">ETA / Route</p>
                          <p className="mt-2 font-black">{etaMinutes ? `${etaMinutes} min ETA` : "ETA pending"}</p>
                          <p className="mt-1 text-sm text-slate-600">{Number(booking.route_distance_miles ?? 0).toFixed(1)} mi · {routeMinutes || 0} min</p>
                          <p className="mt-1 text-xs text-slate-500">Created {compactDate(booking.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                      <div className="grid gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pickup</p>
                          <p className="mt-1 font-semibold text-slate-900">{pickup?.address_line_1 || pickup?.address_line || "Address not supplied"}</p>
                          <p className="text-sm text-slate-600">{pickup?.town || ""} {pickup?.postcode || ""}</p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Delivery</p>
                          <p className="mt-1 font-semibold text-slate-900">{delivery?.address_line_1 || delivery?.address_line || "Address not supplied"}</p>
                          <p className="text-sm text-slate-600">{delivery?.town || ""} {delivery?.postcode || ""}</p>
                        </div>

                        <div className="rounded-2xl bg-white p-4 text-xs text-slate-600">
                          <p><span className="font-black text-slate-900">ID:</span> {booking.id}</p>
                          <p className="mt-1"><span className="font-black text-slate-900">Updated:</span> {compactDate(booking.updated_at)}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link href={`/bookings/${booking.id}`} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700">
                            Open booking
                          </Link>
                          <Link href="/dispatch" className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300">
                            Dispatch board
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Visible booking value</p>
          <p className="mt-2 text-3xl font-black">{money(totalValue)}</p>
          <p className="mt-2 text-sm text-slate-500">
            This is an operational view only. Quote attempts and abandoned quote intelligence should remain visible on a separate FC quote/attempts page.
          </p>
        </div>
      </div>
    </main>
  );
}
