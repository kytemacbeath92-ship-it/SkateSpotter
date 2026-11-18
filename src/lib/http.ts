export function json(data: unknown, init: ResponseInit = {}, extra?: HeadersInit) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("cache-control", "private, no-store");
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.append(key, value));
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorJson(message: string, status = 400) {
  return json({ error: message }, { status });
}

export function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseCoord(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function validLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
