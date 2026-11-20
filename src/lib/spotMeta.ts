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

export const SECURITY_LEVELS = ["Heavy", "Moderate", "Light", "None"] as const;

export type SpotType = (typeof SPOT_TYPES)[number];
export type SecurityLevel = (typeof SECURITY_LEVELS)[number];

export function parseSpotType(value: unknown): SpotType | null {
  return typeof value === "string" && (SPOT_TYPES as readonly string[]).includes(value)
    ? (value as SpotType)
    : null;
}

export function parseSecurity(value: unknown): SecurityLevel | null {
  return typeof value === "string" && (SECURITY_LEVELS as readonly string[]).includes(value)
    ? (value as SecurityLevel)
    : null;
}

export function spotMetaLine(spot: { spotType?: string; security?: string }) {
  const parts = [
    spot.spotType?.trim() || "",
    spot.security?.trim() ? `Security ${spot.security.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}
