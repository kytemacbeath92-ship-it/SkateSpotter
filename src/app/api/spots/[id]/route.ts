import { errorJson, json } from "@/lib/http";
import {
  getSpot,
  listPhotos,
  serializePhoto,
  serializeSpot,
  trickOfTheWeek,
} from "@/lib/spots";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  const { id } = await params;
  const spot = await getSpot(id);
  if (!spot) return errorJson("Spot not found", 404);
  const photos = await listPhotos(id, viewer.id);
  const weekly = await trickOfTheWeek(id, viewer.id);
  return json(
    {
      spot: serializeSpot(spot),
      photos: photos.filter((p) => p.kind === "spot").map(serializePhoto),
      tricks: photos.filter((p) => p.kind === "trick").map(serializePhoto),
      trickOfTheWeek: weekly ? serializePhoto(weekly) : null,
      isOwner: spot.created_by === viewer.id,
    },
    {},
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}
