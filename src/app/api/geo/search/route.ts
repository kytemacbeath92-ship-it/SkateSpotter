import { searchPlaces } from "@/lib/geoServer";
import { clampText, errorJson, json } from "@/lib/http";
import { requireSignedIn } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireSignedIn(request);
  if (denied) return denied;
  const q = clampText(new URL(request.url).searchParams.get("q"), 120);
  try {
    const results = await searchPlaces(q);
    return json({ results });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Search failed", 502);
  }
}
