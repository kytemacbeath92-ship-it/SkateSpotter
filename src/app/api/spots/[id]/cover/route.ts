import { sql } from "@/lib/db";
import { errorJson, json } from "@/lib/http";
import { getSpot, serializeSpot } from "@/lib/spots";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  const { id } = await params;
  const spot = await getSpot(id);
  if (!spot) return errorJson("Spot not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("Invalid JSON");
  }
  const photoId =
    body && typeof body === "object" && "photoId" in body
      ? String((body as { photoId: unknown }).photoId)
      : "";
  const action =
    body && typeof body === "object" && "action" in body
      ? String((body as { action: unknown }).action)
      : "request";

  if (action === "approve") {
    if (spot.created_by !== viewer.id) {
      return errorJson("Only the person who logged this spot can approve a cover change", 403);
    }
    if (!spot.pending_cover_photo_id) {
      return errorJson("There is no pending cover photo");
    }
    await sql(
      "update spots set cover_photo_id = pending_cover_photo_id, pending_cover_photo_id = null where id = $1",
      [id],
    );
  } else if (action === "reject") {
    if (spot.created_by !== viewer.id) {
      return errorJson("Only the person who logged this spot can reject a cover change", 403);
    }
    await sql("update spots set pending_cover_photo_id = null where id = $1", [id]);
  } else {
    const photos = await sql<{ id: string; kind: string }>(
      "select id, kind from photos where id = $1 and spot_id = $2",
      [photoId, id],
    );
    if (!photos[0] || photos[0].kind !== "spot") {
      return errorJson("Choose a spot photo to use as the cover");
    }
    if (spot.created_by === viewer.id) {
      await sql(
        "update spots set cover_photo_id = $1, pending_cover_photo_id = null where id = $2",
        [photoId, id],
      );
    } else {
      await sql("update spots set pending_cover_photo_id = $1 where id = $2", [photoId, id]);
    }
  }

  const updated = await getSpot(id);
  return json(
    { spot: serializeSpot(updated!) },
    {},
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}
