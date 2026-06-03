"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { assignDispatchDriverAction } from "@/app/actions/driver-assignment";

type DriverOption = {
  id: string;
  name: string;
  available: boolean;
};

type Props = {
  bookingId: string;
  drivers: DriverOption[];
  disabled?: boolean;
};

export default function AssignDriverInline({ bookingId, drivers, disabled }: Props) {
  const router = useRouter();
  const firstAvailableDriverId = useMemo(
    () => drivers.find((driver) => driver.available)?.id || drivers[0]?.id || "",
    [drivers]
  );

  const [driverId, setDriverId] = useState(firstAvailableDriverId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assignDriver() {
    if (!driverId || disabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assignDispatchDriverAction({ bookingId, driverId });

      if (!result.success) {
        throw new Error(result.error || "Could not assign driver");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign driver");
    } finally {
      setLoading(false);
    }
  }

  if (drivers.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
        No drivers available to assign yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Assign driver</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={driverId}
          onChange={(event) => setDriverId(event.target.value)}
          disabled={disabled || loading}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-50"
        >
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id} disabled={!driver.available}>
              {driver.name} · {driver.available ? "available" : "unavailable"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={assignDriver}
          disabled={disabled || loading || !driverId}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Assign"}
        </button>
      </div>

      {error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
