/**
 * Browser-side helper for admin UI → API calls.
 * In production the admin UI uses a short-lived session cookie set by /api/auth/session
 * OR the operator must configure NEXT_PUBLIC is never used for secrets.
 *
 * For same-origin server components / route handlers we inject the secret server-side.
 * Client components call same-origin APIs; middleware/session handles production.
 *
 * During local dev with ADMIN_API_SECRET unset, APIs allow access (dev_open).
 * When ADMIN_API_SECRET is set, client components should use the session cookie path.
 */

export function adminApiHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}
