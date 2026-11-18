import { sql } from "@/lib/db";
import { reverseGeocode } from "@/lib/geoServer";
import { clampText, errorJson, json, parseCoord, validLatLng } from "@/lib/http";
import { parseDataUrl } from "@/lib/image";
import { serializeSpot, type SpotRow } from "@/lib/spots";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await getViewer(request);
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
      [spot.name, spot.streetAddress, spot.buildingName, spot.description]
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
  return json(
    { spots },
    {},
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}

export async function POST(request: Request) {
  const viewer = await getViewer(request);
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
  const description = clampText(input.description, 2000);
  const photosIn = Array.isArray(input.photos) ? input.photos.slice(0, 6) : [];
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

  let streetAddress = clampText(input.streetAddress, 200);
  let buildingName = clampText(input.buildingName, 120) || null;
  if (!streetAddress) {
    try {
      const geo = await reverseGeocode(lat, lng);
      streetAddress = geo.streetAddress;
      buildingName = buildingName || geo.buildingName;
    } catch {
      streetAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  const id = crypto.randomUUID();
  await sql(
    `insert into spots (
       id, lat, lng, street_address, building_name, description,
       created_by, created_by_name
     ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, lat, lng, streetAddress, buildingName, description, viewer.id, viewer.name],
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
  return json(
    { spot: serializeSpot(created[0]) },
    { status: 201 },
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
