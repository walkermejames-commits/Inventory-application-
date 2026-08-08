import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

const REFLEX_SECRET = process.env.DISPATCH_REFLEX_SECRET || "";

type DispatchTimer = {
  id: string;
  booking_id: string;
  driver_id: string | null;
  timer_type: string;
  escalation_level: number | null;
  metadata: Record<string, unknown> | null;
};

function isAuthorised(request: Request) {
  const nodeEnv = process.env.NODE_ENV || "development";
  // Production must configure a secret — fail closed if missing
  if (!REFLEX_SECRET) {
    return nodeEnv !== "production";
  }

  const headerSecret = request.headers.get("x-dispatch-reflex-secret") || "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const adminKey = process.env.ADMIN_API_SECRET?.trim() || "";
  const providedAdmin =
    request.headers.get("x-api-key")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  return (
    headerSecret === REFLEX_SECRET ||
    bearer === REFLEX_SECRET ||
    (Boolean(adminKey) && providedAdmin === adminKey)
  );
}

function nextEscalationLevel(timer: DispatchTimer) {
  return Number(timer.escalation_level || 0) + 1;
}

function interventionFor(timer: DispatchTimer) {
  const level = nextEscalationLevel(timer);

  if (timer.timer_type === "assignment_response") {
    return {
      task_type: "driver_assignment_ignored",
      priority: level >= 2 ? "urgent" : "high",
      title: "Driver has not responded to assignment",
      detail: "The assigned driver has not accepted or rejected the job before the dispatch timer expired.",
    };
  }

  if (timer.timer_type === "pickup_eta") {
    return {
      task_type: "pickup_eta_drift",
      priority: level >= 2 ? "urgent" : "high",
      title: "Pickup ETA may be drifting",
      detail: "The driver has not progressed through pickup status before the expected timer expired.",
    };
  }

  if (timer.timer_type === "pod_required") {
    return {
      task_type: "proof_of_delivery_missing",
      priority: "urgent",
      title: "Proof of delivery missing",
      detail: "The job requires proof-of-delivery evidence before payout or closure.",
    };
  }

  return {
    task_type: "dispatch_timer_expired",
    priority: "normal",
    title: "Dispatch timer expired",
    detail: `Timer expired: ${timer.timer_type}`,
  };
}

export async function POST(request: Request) {
  try {
    if (!isAuthorised(request)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const now = new Date().toISOString();

    const { data: timers, error: timersError } = await supabase
      .from("dispatch_timers")
      .select("id,booking_id,driver_id,timer_type,escalation_level,metadata")
      .eq("status", "active")
      .lte("due_at", now)
      .order("due_at", { ascending: true })
      .limit(50);

    if (timersError) {
      return NextResponse.json({ error: timersError.message }, { status: 400 });
    }

    const expiredTimers = (timers || []) as DispatchTimer[];

    if (expiredTimers.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const timerIds = expiredTimers.map((timer) => timer.id);

    const operationalEvents = expiredTimers.map((timer) => {
      const intervention = interventionFor(timer);

      return {
        booking_id: timer.booking_id,
        driver_id: timer.driver_id,
        event_type: `timer_expired:${timer.timer_type}`,
        severity: nextEscalationLevel(timer) >= 2 ? "warning" : "info",
        actor_role: "system",
        title: intervention.title,
        detail: intervention.detail,
        metadata: {
          timer_id: timer.id,
          timer_type: timer.timer_type,
          escalation_level: nextEscalationLevel(timer),
          original_metadata: timer.metadata || {},
        },
      };
    });

    const interventionTasks = expiredTimers.map((timer) => {
      const intervention = interventionFor(timer);

      return {
        booking_id: timer.booking_id,
        driver_id: timer.driver_id,
        task_type: intervention.task_type,
        status: "open",
        priority: intervention.priority,
        title: intervention.title,
        detail: intervention.detail,
        metadata: {
          timer_id: timer.id,
          timer_type: timer.timer_type,
          escalation_level: nextEscalationLevel(timer),
        },
      };
    });

    const { error: eventError } = await supabase
      .from("operational_events")
      .insert(operationalEvents);

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 400 });
    }

    const { error: taskError } = await supabase
      .from("intervention_tasks")
      .insert(interventionTasks);

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 400 });
    }

    const { error: timerUpdateError } = await supabase
      .from("dispatch_timers")
      .update({
        status: "fired",
        fired_at: now,
        updated_at: now,
      })
      .in("id", timerIds);

    if (timerUpdateError) {
      return NextResponse.json({ error: timerUpdateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      processed: expiredTimers.length,
      timerIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch reflex failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
