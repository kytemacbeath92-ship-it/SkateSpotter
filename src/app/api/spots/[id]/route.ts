import { errorJson, json } from "@/lib/http";
import {
  countUserPhotos,
  getSpot,
  listPhotos,
  PHOTO_CAP,
  serializePhoto,
  serializeSpot,
  trickOfTheWeek,
} from "@/lib/spots";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await params;
  const spot = await getSpot(id);
  if (!spot) return errorJson("Spot not found", 404);
  const photos = await listPhotos(id, viewer.id);
  const weekly = await trickOfTheWeek(id, viewer.id);
  const [spotUsed, trickUsed] = await Promise.all([
    countUserPhotos(id, viewer.id, "spot"),
    countUserPhotos(id, viewer.id, "trick"),
  ]);
  return json(
    {
      spot: serializeSpot(spot),
      photos: photos.filter((p) => p.kind === "spot").map(serializePhoto),
      tricks: photos.filter((p) => p.kind === "trick").map(serializePhoto),
      trickOfTheWeek: weekly ? serializePhoto(weekly) : null,
      isOwner: spot.created_by === viewer.id,
      photoCaps: {
        spot: { used: spotUsed, max: PHOTO_CAP },
        trick: { used: trickUsed, max: PHOTO_CAP },
      },
    },
  );
}
