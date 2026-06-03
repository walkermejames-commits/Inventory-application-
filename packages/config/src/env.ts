import { z } from "zod";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEFAULT_CURRENCY: z.string().default("gbp")
});

export const supabaseSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required")
});

export const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, "STRIPE_PUBLISHABLE_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_CONNECT_CLIENT_ID: z.string().min(1, "STRIPE_CONNECT_CLIENT_ID is required")
});

export const mapsSchema = z.object({
  MAPS_API_KEY: z.string().min(1, "MAPS_API_KEY is required")
});

export const emailSchema = z.object({
  EMAIL_PROVIDER_API_KEY: z.string().optional()
});

const serverSecretSchema = z.object({
  ADMIN_API_SECRET: z.string().min(24, "ADMIN_API_SECRET must be at least 24 characters").optional(),
  DISPATCH_REFLEX_SECRET: z.string().min(24, "DISPATCH_REFLEX_SECRET must be at least 24 characters").optional(),
  DEMO_DRIVER_ID: z.string().uuid("DEMO_DRIVER_ID must be a driver profile UUID").optional(),
  DEMO_DRIVER_API_SECRET: z.string().min(24, "DEMO_DRIVER_API_SECRET must be at least 24 characters").optional()
});

const sellerSecuritySchema = z.object({
  SELLER_API_SECRET: z.string().min(24, "SELLER_API_SECRET must be at least 24 characters").optional()
});

export const appUrlSchema = z.object({
  APP_URL: z.string().url(),
  MOBILE_DEEP_LINK_URL: z.string().min(1),
  SELLER_APP_URL: z.string().url(),
  ADMIN_APP_URL: z.string().url()
});

const adminSchema = baseSchema.merge(supabaseSchema).merge(stripeSchema).merge(mapsSchema).merge(emailSchema).merge(appUrlSchema).merge(serverSecretSchema);
const sellerSchema = baseSchema.merge(supabaseSchema).merge(appUrlSchema).merge(sellerSecuritySchema);
const mobileSchema = baseSchema.merge(supabaseSchema.pick({ SUPABASE_URL: true, SUPABASE_ANON_KEY: true })).merge(appUrlSchema.pick({ MOBILE_DEEP_LINK_URL: true, APP_URL: true }));
const dbSchema = baseSchema.merge(supabaseSchema);

function parseWithHint<T>(schema: z.ZodType<T>, env: Record<string, string | undefined>, scope: string): T {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`[${scope}] Invalid environment variables: ${details}`);
  }
  return parsed.data;
}

export const loadAdminEnv = (env: Record<string, string | undefined>) => parseWithHint(adminSchema, env, "admin");
export const loadSellerEnv = (env: Record<string, string | undefined>) => parseWithHint(sellerSchema, env, "seller");
export const loadMobileEnv = (env: Record<string, string | undefined>) => parseWithHint(mobileSchema, env, "mobile");
export const loadDbEnv = (env: Record<string, string | undefined>) => parseWithHint(dbSchema, env, "db");
