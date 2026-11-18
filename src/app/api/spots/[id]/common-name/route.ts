import { sql } from "@/lib/db";
import { clampText, errorJson, json } from "@/lib/http";
import { normalizeCommonName } from "@/lib/spotName";
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
  const raw =
    body && typeof body === "object" && "name" in body
      ? (body as { name: unknown }).name
      : "";
  const name = normalizeCommonName(clampText(raw, 80));
  if (name.length < 2) {
    return errorJson("Common name must be at least 2 characters");
  }

  await sql(
    `insert into common_name_logs (id, spot_id, name, user_id, user_name)
     values ($1,$2,$3,$4,$5)`,
    [crypto.randomUUID(), id, name, viewer.id, viewer.name],
  );

  if (!spot.common_name && viewer.id !== spot.created_by) {
    await sql(
      "update spots set common_name = $1, common_name_logged_by = $2 where id = $3",
      [name, viewer.id, id],
    );
  }

  const updated = await getSpot(id);
  const logs = await sql<{ name: string; user_name: string; created_at: string }>(
    "select name, user_name, created_at from common_name_logs where spot_id = $1 order by created_at desc limit 12",
    [id],
  );
  return json(
    { spot: serializeSpot(updated!), logs },
    {},
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}
