import { createSupabaseServerClient } from "@door-in-four/shared";
import { loadSellerEnv } from "@door-in-four/config";

const env = loadSellerEnv(process.env as Record<string, string>);
export const supabase = createSupabaseServerClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
