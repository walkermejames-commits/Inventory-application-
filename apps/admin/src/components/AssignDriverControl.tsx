"use client";

import { useMemo, useState } from "react";
import { assignOperationsDriverAction } from "@/app/actions/driver-assignment";

type DriverOption = {
  id: string;
  label: string;
  available: boolean;
};

type Props = {
  bookingId: string;
  currentDriverId?: string | null;
  drivers: DriverOption[];
};

export default function AssignDriverControl({ bookingId, currentDriverId, drivers }: Props) {
  const [selectedDriver, setSelectedDriver] = useState(currentDriverId || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => Number(b.available) - Number(a.available));
  }, [drivers]);

  async function assignDriver() {
    if (!selectedDriver) {
      setMessage("Choose a driver first.");
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const result = await assignOperationsDriverAction({
        bookingId,
        driverId: selectedDriver,
      });

      if (!result.success) {
        throw new Error(result.error || "Could not assign driver");
      }

      setMessage("Driver assigned successfully.");

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not assign driver");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">FC Driver Assignment</p>

      <select
        value={selectedDriver}
        onChange={(event) => setSelectedDriver(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
      >
        <option value="">Select driver</option>

        {availableDrivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.label} {driver.available ? "• available" : "• busy"}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={assignDriver}
        disabled={loading || !selectedDriver}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Assigning…" : "Assign Driver"}
      </button>

      {message ? (
        <p className="mt-3 text-xs font-semibold text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}
