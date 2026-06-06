import { NextResponse } from "next/server";

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "admin",
    service: "door-in-four-admin",
    operationsBoard: "available",
    dispatchReflex: "available",
    routes: {
      home: "/",
      operations: "/operations",
      bookings: "/bookings",
      dispatchReflex: "/api/organism/dispatch-reflex",
    },
    env: {
      SUPABASE_URL: hasValue(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ADMIN_API_SECRET: hasValue(process.env.ADMIN_API_SECRET),
      DISPATCH_REFLEX_SECRET: hasValue(process.env.DISPATCH_REFLEX_SECRET),
      STRIPE_SECRET_KEY: hasValue(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: hasValue(process.env.STRIPE_WEBHOOK_SECRET),
    },
  });
}
