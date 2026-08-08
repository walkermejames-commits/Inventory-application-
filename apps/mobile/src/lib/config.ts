/**
 * Mobile pilot configuration.
 *
 * PRIVATE PILOT MODE (not production auth):
 * - EXPO_PUBLIC_DEMO_DRIVER_ID identifies the pilot driver user id
 * - EXPO_PUBLIC_MOBILE_API_KEY must match server MOBILE_API_SECRET
 *
 * Never embed ADMIN_API_SECRET in the Expo app.
 * Replace this with real driver Supabase Auth when leaving pilot.
 */

export type PilotMode = {
  enabled: true;
  label: "private-pilot";
  driverId: string;
  usesSharedMobileSecret: true;
};

export function getAdminApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_ADMIN_API_URL || "").replace(/\/$/, "");
}

export function getDriverId(): string {
  return (process.env.EXPO_PUBLIC_DEMO_DRIVER_ID || "").trim();
}

/** Must match server MOBILE_API_SECRET (pilot). Not the admin secret. */
export function getMobileApiKey(): string {
  return (process.env.EXPO_PUBLIC_MOBILE_API_KEY || "").trim();
}

export function getPilotMode(): PilotMode | null {
  const driverId = getDriverId();
  const key = getMobileApiKey();
  if (!driverId || !key) return null;
  return {
    enabled: true,
    label: "private-pilot",
    driverId,
    usesSharedMobileSecret: true,
  };
}

export function getMobileConfigErrors(): string[] {
  const errors: string[] = [];
  if (!getAdminApiBaseUrl()) {
    errors.push("EXPO_PUBLIC_ADMIN_API_URL is not set");
  }
  if (!getDriverId()) {
    errors.push(
      "EXPO_PUBLIC_DEMO_DRIVER_ID is not set (private-pilot driver user id)"
    );
  }
  if (!getMobileApiKey()) {
    errors.push(
      "EXPO_PUBLIC_MOBILE_API_KEY is not set (must match MOBILE_API_SECRET — never use ADMIN_API_SECRET)"
    );
  }
  return errors;
}

/** Headers for every driver-scoped request. */
export function driverAuthHeaders(driverId = getDriverId()): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-driver-id": driverId,
  };
  const key = getMobileApiKey();
  if (key) {
    headers["x-api-key"] = key;
  }
  return headers;
}
