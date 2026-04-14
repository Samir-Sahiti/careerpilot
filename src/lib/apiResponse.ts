import { NextResponse } from "next/server";

export function errorResponse(
  message: string,
  status = 500,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ error: message }, { status, headers });
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function rateLimitResponse(message: string): NextResponse {
  return errorResponse(message, 429, { "Retry-After": "3600" });
}
