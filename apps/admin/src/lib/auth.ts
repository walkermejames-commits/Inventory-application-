import { NextResponse } from "next/server";
import {
  requireAdminApiAuth,
  requireMobileApiAuth,
  type ApiAuthSuccess,
} from "@door-in-four/shared";

export function unauthorized(result: { status: number; error: string }) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

/** Gate admin/ops/payment APIs. Returns auth context or a NextResponse to return. */
export function gateAdminApi(request: Request): ApiAuthSuccess | NextResponse {
  const result = requireAdminApiAuth(request);
  if (result.ok === false) return unauthorized(result);
  return result;
}

/** Gate mobile/driver APIs. */
export function gateMobileApi(
  request: Request,
  options?: { expectedDriverId?: string | null }
): ApiAuthSuccess | NextResponse {
  const result = requireMobileApiAuth(request, options);
  if (result.ok === false) return unauthorized(result);
  return result;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
