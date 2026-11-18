import "server-only";
import { validLatLng } from "./http";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";
const UA = "SkateSpotter/1.0 (https://github.com/kytemacbeath92-ship-it/SkateSpotter)";

export type ReverseResult = {
  streetAddress: string;
  buildingName: string | null;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  steps: { instruction: string; distanceMeters: number; durationSeconds: number }[];
};

const reverseCache = new Map<string, ReverseResult>();

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult> {
  if (!validLatLng(lat, lng)) {
    throw new Error("Invalid coordinates");
  }
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const hit = reverseCache.get(key);
  if (hit) return hit;

  const url = `${NOMINATIM}/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=jsonv2&addressdetails=1`;
  const data = await fetchJson(url);
  const address = (data.address ?? {}) as Record<string, string>;
  const street =
    [address.house_number, address.road].filter(Boolean).join(" ") ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.neighbourhood ||
    address.suburb ||
    address.city ||
    "";
  const building =
    (typeof data.name === "string" && data.name) ||
    address.building ||
    address.amenity ||
    address.leisure ||
    address.tourism ||
    address.shop ||
    null;
  const result: ReverseResult = {
    streetAddress: street || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    buildingName: building && building !== street ? building : null,
  };
  reverseCache.set(key, result);
  return result;
}

export async function searchPlaces(query: string) {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=8`;
  const data = await fetchJson(url);
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!validLatLng(lat, lng)) return null;
      return {
        label: String(row.display_name ?? ""),
        lat,
        lng,
      };
    })
    .filter((row): row is { label: string; lat: number; lng: number } => row !== null);
}

const PROFILES = new Set(["cycling", "walking", "driving"]);

export async function routeTo(options: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  profile?: string;
}): Promise<RouteResult> {
  const { fromLat, fromLng, toLat, toLng } = options;
  if (![fromLat, fromLng, toLat, toLng].every((n) => Number.isFinite(n)) ||
    !validLatLng(fromLat, fromLng) ||
    !validLatLng(toLat, toLng)
  ) {
    throw new Error("Invalid coordinates");
  }
  const profile = PROFILES.has(options.profile ?? "") ? (options.profile as string) : "cycling";
  const url = `${OSRM}/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
  const data = await fetchJson(url);
  const route = data.routes?.[0];
  if (!route) {
    throw new Error("No route found");
  }
  const steps: RouteResult["steps"] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const name = step.name ? ` onto ${step.name}` : "";
      const type = step.maneuver?.type ?? "continue";
      const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : "";
      steps.push({
        instruction: `${type}${modifier}${name}`.replace(/\s+/g, " ").trim(),
        distanceMeters: Number(step.distance) || 0,
        durationSeconds: Number(step.duration) || 0,
      });
    }
  }
  return {
    distanceMeters: Number(route.distance) || 0,
    durationSeconds: Number(route.duration) || 0,
    geometry: route.geometry,
    steps,
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Map service is unavailable right now");
  }
  return response.json();
}
