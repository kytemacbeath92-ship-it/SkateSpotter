import type { RouteInfo } from "./types";

export type Coord = { lat: number; lng: number };

const SPEEDS_MPS = {
  cycling: 4.2,
  walking: 1.4,
  driving: 11.1,
} as const;

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatCoordAddress(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function localRoute(
  from: Coord,
  to: Coord,
  profile: keyof typeof SPEEDS_MPS = "cycling",
): RouteInfo {
  const distanceMeters = haversine(from.lat, from.lng, to.lat, to.lng);
  const speed = SPEEDS_MPS[profile] ?? SPEEDS_MPS.cycling;
  const durationSeconds = Math.max(30, distanceMeters / speed);
  const steps = 8;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coordinates.push([from.lng + (to.lng - from.lng) * t, from.lat + (to.lat - from.lat) * t]);
  }
  const verb = profile === "walking" ? "Walk" : profile === "driving" ? "Drive" : "Skate";
  return {
    distanceMeters,
    durationSeconds,
    geometry: { type: "LineString", coordinates },
    steps: [
      {
        instruction: `${verb} toward the spot`,
        distanceMeters,
        durationSeconds,
      },
    ],
  };
}
