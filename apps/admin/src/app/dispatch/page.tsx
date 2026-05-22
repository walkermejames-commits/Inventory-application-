import Link from "next/link";
import { supabase } from "@/lib/server";
import AssignDriverForm from "@/components/fc/AssignDriverForm";

type DriverProfile = {
  id: string;
  user_id: string | null;
  status: string | null;
  service_radius_miles: number | null;
  current_availability: boolean | null;
  rating_average: number | null;
  rating_count: number | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type VehicleRow = {
  id: string;
  driver_id: string | null;
  vehicle_type: string | null;
  registration: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  active: boolean | null;
};

type TownRow = {
  name: string;
  lat: number | null;
  lng: number | null;
  active: boolean | null;
};

type ServiceZone = {
  id: string;
  name: string;
  centre_lat: number | null;
  centre_lng: number | null;
  radius_miles: number | null;
  active: boolean | null;
};

type BookingRow = {
  id: string;
  driver_id: string | null;
  status: string | null;
  payment_status: string | null;
  accepted_price: number | null;
  driver_payout_amount: number | null;
  item_title: string | null;
  item_size: string | null;
  approximate_weight_kg: number | null;
  requires_van: boolean | null;
  requires_two_people: boolean | null;
  fragile: boolean | null;
  pickup_contacts?: {
    town?: string | null;
    postcode?: string | null;
  } | null;
  delivery_addresses?: {
    town?: string | null;
    postcode?: string | null;
  } | null;
};

const activeStatuses = [
  "paid_awaiting_dispatch",
  "driver_assigned",
  "driver_en_route_to_pickup",
  "driver_arrived_at_pickup",
  "pickup_verified",
  "item_collected",
  "driver_en_route_to_delivery",
  "driver_arrived_at_delivery",
  "delivery_verified",
];

function money(value?: number | null) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function normaliseTown(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getTownPoint(towns: TownRow[], name?: string | null) {
  const town = towns.find((item) => normaliseTown(item.name) === normaliseTown(name));

  if (!town?.lat || !town?.lng) return null;

  return {
    lat: Number(town.lat),
    lng: Number(town.lng),
  };
}

function mapPosition(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) return { left: 50, top: 50 };

  const minLat = 50.8;
  const maxLat = 51.5;
  const minLng = -0.55;
  const maxLng = 0.95;

  const left = ((Number(lng) - minLng) / (maxLng - minLng)) * 100;
  const top = 100 - ((Number(lat) - minLat) / (maxLat - minLat)) * 100;

  return {
    left: Math.min(94, Math.max(6, left)),
    top: Math.min(90, Math.max(10, top)),
  };
}

export default async function DispatchPage() {
  const [driversResult, usersResult, vehiclesResult, bookingsResult, townsResult, zonesResult] = await Promise.all([
    supabase.from("driver_profiles").select("id,user_id,status,service_radius_miles,current_availability,rating_average,rating_count").order("created_at", { ascending: false }),
    supabase.from("users").select("id,full_name,email,phone"),
    supabase.from("vehicles").select("id,driver_id,vehicle_type,registration,make,model,colour,active"),
    supabase
      .from("bookings")
      .select(`
        id,driver_id,status,payment_status,accepted_price,driver_payout_amount,item_title,item_size,approximate_weight_kg,requires_van,requires_two_people,fragile,
        pickup_contacts (town, postcode),
        delivery_addresses (town, postcode)
      `)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("towns").select("name,lat,lng,active").eq("active", true),
    supabase.from("service_zones").select("id,name,centre_lat,centre_lng,radius_miles,active").eq("active", true),
  ]);

  const drivers = (driversResult.data ?? []) as DriverProfile[];
  const users = (usersResult.data ?? []) as UserRow[];
  const vehicles = (vehiclesResult.data ?? []) as VehicleRow[];
  const bookings = (bookingsResult.data ?? []) as BookingRow[];
  const towns = (townsResult.data ?? []) as TownRow[];
  const zones = (zonesResult.data ?? []) as ServiceZone[];

  const unassignedJobs = bookings.filter((booking) => !booking.driver_id && booking.status === "paid_awaiting_dispatch");
  const assignedJobs = bookings.filter((booking) => booking.driver_id);

  const assignableDrivers = drivers.map((driver) => {
    const user = users.find((item) => item.id === driver.user_id);
    const activeJobs = assignedJobs.filter((job) => job.driver_id === driver.id).length;

    return {
      id: driver.id,
      name: user?.full_name || "Unnamed driver",
      available: Boolean(driver.current_availability),
      activeJobs,
    };
  });

  const driverCards = drivers.map((driver, index) => {
    const user = users.find((item) => item.id === driver.user_id);
    const vehicle = vehicles.find((item) => item.driver_id === driver.id && item.active !== false);
    const driverJobs = assignedJobs.filter((job) => job.driver_id === driver.id);
    const fallbackZone = zones[index % Math.max(zones.length, 1)];
    const point = fallbackZone ? { lat: Number(fallbackZone.centre_lat), lng: Number(fallbackZone.centre_lng) } : null;

    return {
      driver,
      user,
      vehicle,
      jobs: driverJobs,
      point,
      map: mapPosition(point?.lat, point?.lng),
    };
  });

  const jobPins = unassignedJobs.map((job) => {
    const pickupTown = job.pickup_contacts?.town;
    const point = getTownPoint(towns, pickupTown);
    return {
      job,
      point,
      map: mapPosition(point?.lat, point?.lng),
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">FC Dispatch</p>
            <h1 className="text-4xl font-black tracking-tight">Driver map</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              FC view for drivers, vehicles, active paid jobs and launch-zone coverage. Live GPS comes next; this version uses existing zones and town coordinates.
            </p>
          </div>
          <Link href="/" className="inline-flex h-fit items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">
            Return to FC
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Drivers</p>
            <p className="mt-2 text-3xl font-black">{drivers.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Available</p>
            <p className="mt-2 text-3xl font-black">{drivers.filter((driver) => driver.current_availability).length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Unassigned paid jobs</p>
            <p className="mt-2 text-3xl font-black">{unassignedJobs.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Active zones</p>
            <p className="mt-2 text-3xl font-black">{zones.length}</p>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.16),transparent_30%)]" />
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

            {zones.map((zone) => {
              const pos = mapPosition(zone.centre_lat, zone.centre_lng);
              return (
                <div key={zone.id} className="absolute rounded-full border border-emerald-300/25 bg-emerald-400/5" style={{ left: `${pos.left - 10}%`, top: `${pos.top - 10}%`, width: "20%", height: "20%" }}>
                  <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300" />
                  <span className="absolute left-1/2 top-1/2 mt-3 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-emerald-200">{zone.name}</span>
                </div>
              );
            })}

            {driverCards.map(({ driver, user, vehicle, map }) => (
              <div key={driver.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${map.left}%`, top: `${map.top}%` }}>
                <div className="group relative">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 shadow-xl ${driver.current_availability ? "border-emerald-300 bg-emerald-500 text-slate-950" : "border-slate-400 bg-slate-700 text-white"}`}>
                    🚚
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-14 z-20 hidden w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm shadow-2xl group-hover:block">
                    <p className="font-black">{user?.full_name || "Unnamed driver"}</p>
                    <p className="mt-1 text-slate-400">{vehicle ? `${vehicle.make || "Vehicle"} ${vehicle.model || ""}` : "No active vehicle"}</p>
                    <p className="mt-1 text-slate-400">Jobs: {driverCards.find((card) => card.driver.id === driver.id)?.jobs.length ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}

            {jobPins.map(({ job, map }) => (
              <div key={job.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${map.left}%`, top: `${map.top}%` }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-400 text-slate-950 shadow-xl">📦</div>
              </div>
            ))}

            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-300 backdrop-blur">
              <span className="font-bold text-white">Legend:</span> 🚚 drivers · 📦 unassigned paid jobs · green circles launch/service zones
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black">Unassigned jobs</h2>
              <div className="mt-4 space-y-3">
                {unassignedJobs.length === 0 ? (
                  <p className="text-sm text-slate-400">No paid jobs waiting for driver assignment.</p>
                ) : (
                  unassignedJobs.map((job) => (
                    <div key={job.id} className="rounded-2xl bg-slate-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{job.item_title || "Delivery job"}</p>
                          <p className="mt-1 text-sm text-slate-400">{job.pickup_contacts?.town || "Pickup"} → {job.delivery_addresses?.town || "Delivery"}</p>
                        </div>
                        <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">{money(job.driver_payout_amount ?? job.accepted_price)}</span>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">{job.requires_van ? "Van required · " : ""}{job.requires_two_people ? "Two-person · " : ""}{job.fragile ? "Fragile" : "Standard"}</p>

                      <AssignDriverForm bookingId={job.id} drivers={assignableDrivers} />
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/10 p-6">
              <h2 className="text-2xl font-black">Drivers</h2>
              <div className="mt-4 space-y-3">
                {driverCards.map(({ driver, user, vehicle, jobs }) => (
                  <div key={driver.id} className="rounded-2xl bg-slate-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{user?.full_name || "Unnamed driver"}</p>
                        <p className="mt-1 text-sm text-slate-400">{vehicle ? `${vehicle.colour || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim() || vehicle.vehicle_type : "No vehicle"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${driver.current_availability ? "bg-emerald-400 text-slate-950" : "bg-slate-700 text-slate-200"}`}>
                        {driver.current_availability ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/10 px-3 py-1">{jobs.length} active job(s)</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">Radius {Number(driver.service_radius_miles ?? 0).toFixed(0)} mi</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">Rating {Number(driver.rating_average ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
