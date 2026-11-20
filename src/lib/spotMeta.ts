export const SPOT_TYPES = [
  "Skatepark",
  "Stairs",
  "Ledge",
  "Rail",
  "Bench",
  "Flat ground",
  "Bowl",
  "Drain",
] as const;

export const STOPPERS = ["Yes", "No"] as const;

export const SECURITY_LEVELS = ["Heavy", "Moderate", "Light", "None"] as const;

export type SpotType = (typeof SPOT_TYPES)[number];
export type Stoppers = (typeof STOPPERS)[number];
export type SecurityLevel = (typeof SECURITY_LEVELS)[number];

export function parseSpotType(value: unknown): SpotType | null {
  return typeof value === "string" && (SPOT_TYPES as readonly string[]).includes(value)
    ? (value as SpotType)
    : null;
}

export function parseStoppers(value: unknown): Stoppers | null {
  return typeof value === "string" && (STOPPERS as readonly string[]).includes(value)
    ? (value as Stoppers)
    : null;
}

export function parseSecurity(value: unknown): SecurityLevel | null {
  return typeof value === "string" && (SECURITY_LEVELS as readonly string[]).includes(value)
    ? (value as SecurityLevel)
    : null;
}

export function spotMetaLine(spot: { spotType?: string; stoppers?: string; security?: string }) {
  const parts = [
    spot.spotType?.trim() || "",
    spot.stoppers?.trim() ? `Stoppers ${spot.stoppers.trim()}` : "",
    spot.security?.trim() ? `Security ${spot.security.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}
