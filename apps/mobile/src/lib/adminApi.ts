import { Booking, BookingStatus } from '../types/booking';

const adminApiUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL || '';
const demoDriverId = process.env.EXPO_PUBLIC_DEMO_DRIVER_ID || '';
const demoDriverApiSecret = process.env.EXPO_PUBLIC_DEMO_DRIVER_API_SECRET || '';

type JobResponse = {
  booking?: Booking;
  jobs?: Booking[];
  error?: string;
};

export type ProgressProofPayload = {
  pickupProofPath?: string;
  deliveryProofPath?: string;
  capturedAt?: string;
  gps?: {
    lat: number;
    lng: number;
  };
};

function baseUrl() {
  return adminApiUrl.replace(/\/$/, '');
}

function requirePilotConfig() {
  if (!adminApiUrl || !demoDriverId || !demoDriverApiSecret) {
    throw new Error('Driver API is not configured');
  }
}

function authHeaders(accessToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (demoDriverApiSecret) {
    headers['x-demo-driver-secret'] = demoDriverApiSecret;
  }

  return headers;
}

async function parseResponse(response: Response): Promise<JobResponse> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Driver API request failed');
  }

  return data;
}

export function getDriverApiConfigStatus() {
  return {
    adminApiUrl,
    demoDriverId,
    demoDriverApiSecret,
    configured: Boolean(adminApiUrl && demoDriverId && demoDriverApiSecret),
  };
}

export async function fetchAssignedJobs(accessToken?: string): Promise<Booking[]> {
  requirePilotConfig();

  const response = await fetch(
    `${baseUrl()}/api/mobile/jobs?driverId=${encodeURIComponent(demoDriverId)}`,
    {
      headers: authHeaders(accessToken),
    }
  );
  const data = await parseResponse(response);

  return data.jobs || [];
}

export async function fetchJobDetail(bookingId: string, accessToken?: string): Promise<Booking | null> {
  requirePilotConfig();

  const response = await fetch(
    `${baseUrl()}/api/mobile/jobs/${encodeURIComponent(bookingId)}?driverId=${encodeURIComponent(demoDriverId)}`,
    {
      headers: authHeaders(accessToken),
    }
  );
  const data = await parseResponse(response);

  return data.booking || null;
}

export async function respondToJob(
  bookingId: string,
  responseValue: 'accepted' | 'rejected',
  accessToken?: string
): Promise<Booking | null> {
  requirePilotConfig();

  const response = await fetch(`${baseUrl()}/api/mobile/jobs/respond`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      bookingId,
      driverId: demoDriverId,
      response: responseValue,
    }),
  });
  const data = await parseResponse(response);

  return data.booking || null;
}

export async function progressJobStatus(
  bookingId: string,
  toStatus: BookingStatus,
  proof?: ProgressProofPayload,
  accessToken?: string
): Promise<Booking | null> {
  requirePilotConfig();

  const response = await fetch(`${baseUrl()}/api/mobile/jobs/${encodeURIComponent(bookingId)}/progress`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      driverId: demoDriverId,
      toStatus,
      proof: proof || null,
    }),
  });
  const data = await parseResponse(response);

  return data.booking || null;
}
