import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Lazy clients so `next build` can collect page data without real secrets.
 * Runtime requests still require env (and will throw clearly if missing).
 */
let _supabase: SupabaseClient | null = null;
let _stripe: Stripe | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }
  return _supabase;
}

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

/** Back-compat proxies — resolve on first property access. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client as object, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const stripe = new Proxy({} as Stripe, {
  get(_target, property, receiver) {
    const client = getStripe();
    const value = Reflect.get(client as object, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const env = {
  get SUPABASE_URL() {
    return process.env.SUPABASE_URL || "";
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  },
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY || "";
  },
  get NEXT_PUBLIC_SUPABASE_URL() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  },
  get NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  },
};
