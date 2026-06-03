"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignDispatchDriverAction } from "@/app/actions/driver-assignment";

export type AssignableDriver = {
  id: string;
  name: string;
  available: boolean;
  activeJobs: number;
};

type Props = {
  bookingId: string;
  drivers: AssignableDriver[];
};

export default function AssignDriverForm({ bookingId, drivers }: Props) {
  const router = useRouter();
  const firstAvailable = drivers.find((driver) => driver.available)?.id || drivers[0]?.id || "";
  const [driverId, setDriverId] = useState(firstAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assignDriver() {
    if (!driverId) return;

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
      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-xs text-amber-100">
        No drivers exist yet. Add drivers before assigning jobs.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
        Assign driver
      </label>

      <div className="flex flex-col gap-3">
        <select
          value={driverId}
          onChange={(event) => setDriverId(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
        >
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id} disabled={!driver.available}>
              {driver.name} · {driver.available ? "available" : "unavailable"} · {driver.activeJobs} active
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={assignDriver}
          disabled={!driverId || loading}
          className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Assigning..." : "FC assign driver"}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
