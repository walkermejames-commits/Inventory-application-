import { createClient } from "@supabase/supabase-js";

// Seller app uses service role for server-side operations
// Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Render

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Missing Supabase environment variables in seller app");
}

export const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "", {
  auth: {
    persistSession: false,
  },
});