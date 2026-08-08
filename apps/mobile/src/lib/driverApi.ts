import type { Booking } from "../types/booking";
import {
  driverAuthHeaders,
  getAdminApiBaseUrl,
  getDriverId,
  getMobileApiKey,
  getMobileConfigErrors,
} from "./config";
import {
  buildProgressRequestBody,
  getNextDriverStatus,
  jobFetchQuery,
  progressEndpointPath,
  validateProgressMutation,
  type ProgressMutationInput,
} from "./driverProgress";

export class DriverApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status = 0, detail?: string) {
    super(message);
    this.name = "DriverApiError";
    this.status = status;
    this.detail = detail;
  }
}

function assertMobileConfig() {
  const errors = getMobileConfigErrors();
  if (errors.length) {
    throw new DriverApiError(errors.join("; "), 0);
  }
}

async function parseJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function mapJob(raw: any): Booking {
  return {
    id: raw.id,
    status: raw.status,
    payment_status: raw.payment_status,
    pickup_town: raw.pickup_town || "Pickup",
    pickup_postcode: raw.pickup_postcode ?? null,
    pickup_address_line: raw.pickup_address_line ?? null,
    delivery_town: raw.delivery_town || "Delivery",
    delivery_postcode: raw.delivery_postcode ?? null,
    delivery_address_line: raw.delivery_address_line ?? null,
    item_title: raw.item_title || "Delivery job",
    item_size: raw.item_size || "medium",
    approximate_weight_kg: Number(raw.approximate_weight_kg || 0),
    fragile: Boolean(raw.fragile),
    requires_two_people: Boolean(raw.requires_two_people),
    requires_van: Boolean(raw.requires_van),
    delivery_quote_amount: raw.delivery_quote_amount,
    accepted_price: raw.accepted_price,
    driver_payout_amount: raw.driver_payout_amount,
    driver_id: raw.driver_id ?? getDriverId(),
    pickup_stairs_floors: raw.pickup_stairs_floors ?? null,
    delivery_stairs_floors: raw.delivery_stairs_floors ?? null,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at ?? null,
  };
}

/** Load a single assigned booking for this driver (includes delivered/completed). */
export async function fetchDriverJob(bookingId: string): Promise<Booking> {
  assertMobileConfig();
  const driverId = getDriverId();
  const base = getAdminApiBaseUrl();
  const url = `${base}${jobFetchQuery(driverId, bookingId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: driverAuthHeaders(driverId),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new DriverApiError(
      data?.error || data?.detail || "Could not load job",
      response.status,
      data?.detail
    );
  }

  if (data.job) {
    return mapJob(data.job);
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const found = jobs.find((j: any) => j.id === bookingId);
  if (!found) {
    throw new DriverApiError("Job not found for this driver", 404);
  }
  return mapJob(found);
}

export async function fetchDriverJobs(): Promise<Booking[]> {
  assertMobileConfig();
  const driverId = getDriverId();
  const base = getAdminApiBaseUrl();
  const url = `${base}/api/mobile/jobs?driverId=${encodeURIComponent(driverId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: driverAuthHeaders(driverId),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new DriverApiError(
      data?.error || "Could not load assigned jobs",
      response.status,
      data?.detail
    );
  }

  return (data.jobs || []).map(mapJob);
}

/**
 * Advance one strict step via POST /api/drivers/jobs/[bookingId]/progress.
 * Does not optimistically mutate local state — caller refreshes on success.
 */
export async function advanceDriverJobProgress(input: {
  bookingId: string;
  fromStatus: Booking["status"];
  sellerCode?: string;
  buyerCode?: string;
  photoPath?: string;
}): Promise<{ booking: Booking | null }> {
  assertMobileConfig();

  const driverId = getDriverId();
  const toStatus = getNextDriverStatus(input.fromStatus);
  if (!toStatus) {
    throw new DriverApiError("Job is already at the final driver status", 400);
  }

  if (!getMobileApiKey()) {
    throw new DriverApiError(
      "EXPO_PUBLIC_MOBILE_API_KEY is required (do not use ADMIN_API_SECRET in the app)",
      0
    );
  }

  const mutation: ProgressMutationInput = {
    bookingId: input.bookingId,
    driverId,
    fromStatus: input.fromStatus,
    toStatus,
    sellerCode: input.sellerCode,
    buyerCode: input.buyerCode,
    photoPath: input.photoPath,
  };

  const validation = validateProgressMutation(mutation);
  if (!validation.ok) {
    throw new DriverApiError(validation.error, 400);
  }

  const base = getAdminApiBaseUrl();
  const url = `${base}${progressEndpointPath(input.bookingId)}`;
  const body = buildProgressRequestBody(mutation);

  const response = await fetch(url, {
    method: "POST",
    headers: driverAuthHeaders(driverId),
    body: JSON.stringify(body),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    const message =
      data?.error ||
      data?.detail ||
      `Progress update failed (${response.status})`;
    throw new DriverApiError(message, response.status, data?.detail);
  }

  if (data.booking) {
    return { booking: mapJob(data.booking) };
  }

  // Server acknowledged but did not return booking — caller should refetch
  return { booking: null };
}
