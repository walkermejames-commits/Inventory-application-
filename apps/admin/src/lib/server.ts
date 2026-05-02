import { createSupabaseServerClient, createStripeClient } from "@door-in-four/shared";
import { loadAdminEnv } from "@door-in-four/config";

export const env = loadAdminEnv(process.env as Record<string, string>);
export const supabase = createSupabaseServerClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
export const stripe = createStripeClient(env.STRIPE_SECRET_KEY);
