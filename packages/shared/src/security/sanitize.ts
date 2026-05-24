const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const HTML_TAGS = /<[^>]*>/g;
const MULTISPACE = /\s+/g;

export const SECURITY_LIMITS = {
  NAME: 120,
  EMAIL: 180,
  PHONE: 40,
  TOWN: 120,
  POSTCODE: 12,
  ADDRESS: 250,
  NOTES: 1000,
  ITEM_TITLE: 180,
  ITEM_SIZE: 40,
  VEHICLE_REGISTRATION: 20,
  VEHICLE_DETAIL: 80,
  URL: 1000,
  UUID: 64,
};

function stripDangerousText(input: unknown, maxLength: number) {
  if (typeof input !== "string") return "";

  return input
    .replace(HTML_TAGS, "")
    .replace(CONTROL_CHARS, "")
    .replace(MULTISPACE, " ")
    .trim()
    .slice(0, maxLength);
}

function keepOnly(input: string, allowed: RegExp) {
  return Array.from(input).filter((character) => allowed.test(character)).join("");
}

export function cleanText(input: unknown, maxLength = SECURITY_LIMITS.NOTES) {
  return stripDangerousText(input, maxLength);
}

export function cleanName(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.NAME);
}

export function cleanEmail(input: unknown) {
  const cleaned = stripDangerousText(input, SECURITY_LIMITS.EMAIL).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : "";
}

export function cleanPhone(input: unknown) {
  return keepOnly(stripDangerousText(input, SECURITY_LIMITS.PHONE), /[+0-9()\-\s]/);
}

export function cleanTown(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.TOWN);
}

export function cleanPostcode(input: unknown) {
  return keepOnly(stripDangerousText(input, SECURITY_LIMITS.POSTCODE).toUpperCase(), /[A-Z0-9\s]/).trim();
}

export function cleanAddress(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.ADDRESS);
}

export function cleanNotes(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.NOTES);
}

export function cleanItemTitle(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.ITEM_TITLE);
}

export function cleanItemSize(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.ITEM_SIZE).toLowerCase();
}

export function cleanVehicleRegistration(input: unknown) {
  return keepOnly(stripDangerousText(input, SECURITY_LIMITS.VEHICLE_REGISTRATION).toUpperCase(), /[A-Z0-9\s]/).trim();
}

export function cleanVehicleDetail(input: unknown) {
  return stripDangerousText(input, SECURITY_LIMITS.VEHICLE_DETAIL);
}

export function cleanUrl(input: unknown) {
  const cleaned = stripDangerousText(input, SECURITY_LIMITS.URL);
  if (!cleaned) return "";

  try {
    const url = new URL(cleaned);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function cleanUUID(input: unknown) {
  const cleaned = stripDangerousText(input, SECURITY_LIMITS.UUID);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)
    ? cleaned
    : "";
}

export function cleanBoolean(input: unknown) {
  return input === true || input === "true" || input === "on" || input === "1";
}

export function clampNumber(input: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function cleanEnum<T extends string>(input: unknown, allowed: readonly T[], fallback: T) {
  const cleaned = stripDangerousText(input, 80) as T;
  return allowed.includes(cleaned) ? cleaned : fallback;
}
