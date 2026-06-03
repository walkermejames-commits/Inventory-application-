import { createClient } from "@supabase/supabase-js";

type SellerSupabaseClient = any;

let cachedSupabase: SellerSupabaseClient | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getSupabase() {
  if (!cachedSupabase) {
    cachedSupabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedSupabase;
}

export const supabase = new Proxy({} as SellerSupabaseClient, {
  get(_target, property) {
    const client = getSupabase();
    const value = Reflect.get(client, property);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
