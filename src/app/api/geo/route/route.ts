import { routeTo } from "@/lib/geoServer";
import { errorJson, json, parseCoord, validLatLng } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fromLat = parseCoord(url.searchParams.get("fromLat"));
  const fromLng = parseCoord(url.searchParams.get("fromLng"));
  const toLat = parseCoord(url.searchParams.get("toLat"));
  const toLng = parseCoord(url.searchParams.get("toLng"));
  const profile = url.searchParams.get("profile") ?? "cycling";
  if (
    fromLat === null ||
    fromLng === null ||
    toLat === null ||
    toLng === null ||
    !validLatLng(fromLat, fromLng) ||
    !validLatLng(toLat, toLng)
  ) {
    return errorJson("Valid from and to coordinates are required");
  }
  try {
    const result = await routeTo({ fromLat, fromLng, toLat, toLng, profile });
    return json(result);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Routing failed", 502);
  }
}
