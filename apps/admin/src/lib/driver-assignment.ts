import { supabase } from "@/lib/server";

type AssignmentMode = "dispatch" | "operations";

type AssignmentResult = {
  booking: {
    id: string;
    status: string;
    payment_status?: string | null;
    driver_id: string;
  };
  dueAt: string;
};

export async function assignDriverToBooking(
  bookingId: string,
  driverId: string,
  mode: AssignmentMode
): Promise<AssignmentResult> {
  if (!bookingId || !driverId) {
    throw new Error("bookingId and driverId are required");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,status,payment_status,driver_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(bookingError?.message || "Booking not found");
  }

  if (mode === "dispatch") {
    const paymentLooksPaid =
      booking.status === "paid_awaiting_dispatch" ||
      booking.payment_status === "paid" ||
      booking.payment_status === "payment_succeeded" ||
      booking.payment_status === "succeeded";

    if (!paymentLooksPaid || booking.status !== "paid_awaiting_dispatch") {
      throw new Error("Only paid jobs waiting for dispatch can be assigned");
    }

    if (booking.driver_id) {
      throw new Error("Booking already has a driver");
    }
  }

  const { data: driver, error: driverError } = await supabase
    .from("driver_profiles")
    .select("id,status,current_availability")
    .eq("id", driverId)
    .single();

  if (driverError || !driver) {
    throw new Error(driverError?.message || "Driver not found");
  }

  if (mode === "operations" && driver.status && !["approved", "active", "pending"].includes(driver.status)) {
    throw new Error("Driver is not eligible for assignment");
  }

  if (mode === "dispatch" && driver.current_availability === false) {
    throw new Error("Driver is marked unavailable");
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({
      driver_id: driverId,
      status: "driver_assigned",
    })
    .eq("id", bookingId)
    .select("id,status,payment_status,driver_id")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || "Could not assign driver");
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const { error: cancelTimerError } = await supabase
    .from("dispatch_timers")
    .update({
      status: "cancelled",
      updated_at: now.toISOString(),
      metadata: {
        source: "fc_assignment",
        reason: "driver_reassigned",
      },
    })
    .eq("booking_id", bookingId)
    .eq("timer_type", "assignment_response")
    .eq("status", "active");

  if (cancelTimerError) {
    throw new Error(cancelTimerError.message);
  }

  const { error: timerError } = await supabase.from("dispatch_timers").insert({
    booking_id: bookingId,
    driver_id: driverId,
    timer_type: "assignment_response",
    status: "active",
    due_at: dueAt,
    escalation_level: 0,
    metadata: { source: "fc_assignment" },
  });

  if (timerError) {
    throw new Error(timerError.message);
  }

  const { error: statusEventError } = await supabase.from("status_events").insert({
    booking_id: bookingId,
    previous_status: booking.status,
    new_status: "driver_assigned",
    actor_role: "fc",
    note: `FC assigned driver ${driverId}`,
  });

  if (statusEventError) {
    throw new Error(statusEventError.message);
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    actor_role: "fc",
    action: "driver_assigned",
    entity_type: "booking",
    entity_id: bookingId,
    metadata: {
      driver_id: driverId,
      due_at: dueAt,
      timer_type: "assignment_response",
    },
  });

  if (auditError) {
    throw new Error(auditError.message);
  }

  const { error: operationalEventError } = await supabase.from("operational_events").insert({
    booking_id: bookingId,
    driver_id: driverId,
    event_type: "driver_assigned",
    severity: "info",
    actor_role: "fc",
    title: "Driver assigned",
    detail: "Driver assignment timer started.",
    metadata: {
      due_at: dueAt,
      timer_type: "assignment_response",
    },
  });

  if (operationalEventError) {
    throw new Error(operationalEventError.message);
  }

  return {
    booking: updated,
    dueAt,
  };
}
