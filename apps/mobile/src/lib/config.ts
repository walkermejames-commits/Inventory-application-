/**
 * Mobile pilot configuration.
 * Never embed ADMIN_API_SECRET here — only the mobile pilot credential.
 */
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

export function getMobileConfigErrors(): string[] {
  const errors: string[] = [];
  if (!getAdminApiBaseUrl()) {
    errors.push("EXPO_PUBLIC_ADMIN_API_URL is not set");
  }
  if (!getDriverId()) {
    errors.push("EXPO_PUBLIC_DEMO_DRIVER_ID is not set");
  }
  if (!getMobileApiKey()) {
    errors.push("EXPO_PUBLIC_MOBILE_API_KEY is not set (must match MOBILE_API_SECRET on the admin API)");
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
