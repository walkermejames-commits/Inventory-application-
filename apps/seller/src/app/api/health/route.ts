import { NextResponse } from "next/server";

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "seller",
    service: "door-in-four-seller",
    buyerQuoteFlow: "v2",
    routes: {
      home: "/",
      buyerQuote: "/buy",
      legacyQuoteRedirect: "/get-a-quote",
    },
    env: {
      SUPABASE_URL: hasValue(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_SUPABASE_URL: hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      NEXT_PUBLIC_SELLER_URL: hasValue(process.env.NEXT_PUBLIC_SELLER_URL),
      NEXT_PUBLIC_SITE_URL: hasValue(process.env.NEXT_PUBLIC_SITE_URL),
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: hasValue(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      STRIPE_SECRET_KEY: hasValue(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: hasValue(process.env.STRIPE_WEBHOOK_SECRET),
      SELLER_API_SECRET: hasValue(process.env.SELLER_API_SECRET),
    },
  });
}
