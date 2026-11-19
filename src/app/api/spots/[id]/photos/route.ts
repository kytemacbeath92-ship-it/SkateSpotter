import { sql } from "@/lib/db";
import { clampText, errorJson, json } from "@/lib/http";
import { parseDataUrl } from "@/lib/image";
import { countUserPhotos, getSpot, PHOTO_CAP, serializePhoto, type PhotoRow } from "@/lib/spots";
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
  if (!body || typeof body !== "object") return errorJson("Invalid body");
  const input = body as Record<string, unknown>;
  const kind = input.kind === "trick" ? "trick" : "spot";
  const used = await countUserPhotos(id, viewer.id, kind);
  if (used >= PHOTO_CAP) {
    return errorJson(
      kind === "trick"
        ? "You can upload 5 trick photos at this spot"
        : "You can upload 5 spot photos at this spot",
    );
  }
  const caption = clampText(input.caption, 240);
  let parsed;
  try {
    parsed = parseDataUrl(input.dataUrl);
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Could not read photo");
  }

  const photoId = crypto.randomUUID();
  await sql(
    `insert into photos (id, spot_id, kind, mime_type, bytes, caption, created_by, created_by_name)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [photoId, id, kind, parsed.mime, parsed.bytes, caption, viewer.id, viewer.name],
  );

  if (kind === "spot" && !spot.cover_photo_id) {
    await sql("update spots set cover_photo_id = $1 where id = $2", [photoId, id]);
  }

  const rows = await sql<PhotoRow>(
    `select p.id, p.spot_id, p.kind, p.mime_type, p.caption, p.created_by, p.created_by_name, p.created_at,
            0::int as like_count, false as liked_by_me, 0::int as comment_count
     from photos p where p.id = $1`,
    [photoId],
  );
  return json(
    { photo: serializePhoto(rows[0]) },
    { status: 201 },
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}
