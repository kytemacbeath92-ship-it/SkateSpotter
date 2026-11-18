import { reverseGeocode } from "@/lib/geoServer";
import { errorJson, json, parseCoord, validLatLng } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = parseCoord(url.searchParams.get("lat"));
  const lng = parseCoord(url.searchParams.get("lng"));
  if (lat === null || lng === null || !validLatLng(lat, lng)) {
    return errorJson("Valid lat and lng are required");
  }
  try {
    const result = await reverseGeocode(lat, lng);
    return json(result);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Reverse geocode failed", 502);
  }
}
