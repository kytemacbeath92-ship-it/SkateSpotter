export type SpotNameFields = {
  commonName?: string | null;
  buildingName?: string | null;
  streetAddress?: string | null;
};

export function displaySpotName(spot: SpotNameFields): string {
  const common = spot.commonName?.trim();
  if (common) return common;
  const building = spot.buildingName?.trim();
  if (building) return building;
  const street = spot.streetAddress?.trim();
  if (street) return street;
  return "Unnamed spot";
}

export function normalizeCommonName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
