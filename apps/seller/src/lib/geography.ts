type PostcodeLookupResult = {
  latitude: number;
  longitude: number;
};

export type RouteEstimate = {
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  distanceMiles: number;
  durationMinutes: number;
  estimated: boolean;
};

const DEFAULT_DISTANCE_MILES = 8;
const DEFAULT_DURATION_MINUTES = 25;
const AVERAGE_URBAN_SPEED_MPH = 18;

const normalisePostcode = (postcode: string) => postcode.trim().replace(/\s+/g, " ").toUpperCase();

async function lookupPostcode(postcode: string): Promise<PostcodeLookupResult | null> {
  const cleanPostcode = normalisePostcode(postcode);

  if (!cleanPostcode) return null;

  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const result = payload?.result;

    if (typeof result?.latitude !== "number" || typeof result?.longitude !== "number") {
      return null;
    }

    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch {
    return null;
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(a: PostcodeLookupResult, b: PostcodeLookupResult) {
  const earthRadiusMiles = 3958.8;
  const latDistance = toRadians(b.latitude - a.latitude);
  const lngDistance = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(latDistance / 2);
  const sinLng = Math.sin(lngDistance / 2);

  const value =
    sinLat * sinLat +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * sinLng * sinLng;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function estimateRouteFromPostcodes(
  pickupPostcode: string,
  deliveryPostcode: string
): Promise<RouteEstimate> {
  const [pickup, delivery] = await Promise.all([
    lookupPostcode(pickupPostcode),
    lookupPostcode(deliveryPostcode),
  ]);

  if (!pickup || !delivery) {
    return {
      pickupLat: pickup?.latitude ?? null,
      pickupLng: pickup?.longitude ?? null,
      deliveryLat: delivery?.latitude ?? null,
      deliveryLng: delivery?.longitude ?? null,
      distanceMiles: DEFAULT_DISTANCE_MILES,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      estimated: true,
    };
  }

  const straightLineMiles = haversineMiles(pickup, delivery);
  const roadAdjustedMiles = Math.max(1, straightLineMiles * 1.28);
  const durationMinutes = Math.max(10, (roadAdjustedMiles / AVERAGE_URBAN_SPEED_MPH) * 60 + 8);

  return {
    pickupLat: pickup.latitude,
    pickupLng: pickup.longitude,
    deliveryLat: delivery.latitude,
    deliveryLng: delivery.longitude,
    distanceMiles: Math.round(roadAdjustedMiles * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    estimated: false,
  };
}
