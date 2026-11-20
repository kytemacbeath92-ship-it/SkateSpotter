import { sql } from "@/lib/db";
import { formatCoordAddress, haversine } from "@/lib/geo";
import { clampText, errorJson, json, parseCoord, validLatLng } from "@/lib/http";
import { parseDataUrl } from "@/lib/image";
import { SPOTS_PER_HOUR } from "@/lib/limits";
import { parseSecurity, parseSpotType, parseStoppers } from "@/lib/spotMeta";
import { PHOTO_CAP, serializeSpot, type SpotRow } from "@/lib/spots";
import { requireSignedIn, requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireSignedIn(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const q = clampText(url.searchParams.get("q"), 120).toLowerCase();
  const lat = parseCoord(url.searchParams.get("lat"));
  const lng = parseCoord(url.searchParams.get("lng"));
  const rows = await sql<SpotRow>(
    `select * from spots
     order by created_at desc`,
  );
  let spots = rows.map(serializeSpot);
  if (q) {
    spots = spots.filter((spot) =>
      [spot.name, spot.streetAddress, spot.buildingName, spot.description, spot.spotType, spot.stoppers, spot.security]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (lat !== null && lng !== null && validLatLng(lat, lng)) {
    spots = spots
      .map((spot) => ({
        ...spot,
        distanceMeters: haversine(lat, lng, spot.lat, spot.lng),
      }))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }
  return json({ spots });
}

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("Invalid JSON");
  }
  if (!body || typeof body !== "object") return errorJson("Invalid body");
  const input = body as Record<string, unknown>;
  const lat = parseCoord(input.lat);
  const lng = parseCoord(input.lng);
  if (lat === null || lng === null || !validLatLng(lat, lng)) {
    return errorJson("A GPS pin is required");
  }
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await sql<{ n: number }>(
    "select count(*)::int as n from spots where created_by = $1 and created_at > $2",
    [viewer.id, since],
  );
  if ((recent[0]?.n ?? 0) >= SPOTS_PER_HOUR) {
    return errorJson(`You can log ${SPOTS_PER_HOUR} spots per hour. Try again in a bit.`, 429);
  }
  const description = clampText(input.description, 2000);
  const spotType = parseSpotType(input.spotType);
  const stoppers = parseStoppers(input.stoppers);
  const security = parseSecurity(input.security);
  if (!spotType) return errorJson("Choose a type of spot");
  if (!stoppers) return errorJson("Choose whether the spot has stoppers");
  if (!security) return errorJson("Choose a security level");
  const photosIn = Array.isArray(input.photos) ? input.photos.slice(0, PHOTO_CAP) : [];
  const parsedPhotos = [];
  try {
    for (const photo of photosIn) {
      if (!photo || typeof photo !== "object") continue;
      const rec = photo as Record<string, unknown>;
      parsedPhotos.push({
        ...parseDataUrl(rec.dataUrl),
        caption: clampText(rec.caption, 240),
      });
    }
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Could not read photo");
  }

  const streetAddress = clampText(input.streetAddress, 200) || formatCoordAddress(lat, lng);
  const buildingName = clampText(input.buildingName, 120) || null;

  const id = crypto.randomUUID();
  await sql(
    `insert into spots (
       id, lat, lng, street_address, building_name, description,
       spot_type, stoppers, security, created_by, created_by_name
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, lat, lng, streetAddress, buildingName, description, spotType, stoppers, security, viewer.id, viewer.name],
  );

  let coverPhotoId: string | null = null;
  for (const photo of parsedPhotos) {
    const photoId = crypto.randomUUID();
    await sql(
      `insert into photos (id, spot_id, kind, mime_type, bytes, caption, created_by, created_by_name)
       values ($1,$2,'spot',$3,$4,$5,$6,$7)`,
      [photoId, id, photo.mime, photo.bytes, photo.caption, viewer.id, viewer.name],
    );
    if (!coverPhotoId) coverPhotoId = photoId;
  }
  if (coverPhotoId) {
    await sql("update spots set cover_photo_id = $1 where id = $2", [coverPhotoId, id]);
  }

  const created = await sql<SpotRow>("select * from spots where id = $1", [id]);
  return json({ spot: serializeSpot(created[0]) }, { status: 201 });
}
