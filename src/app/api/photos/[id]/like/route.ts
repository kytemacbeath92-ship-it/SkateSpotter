import { sql } from "@/lib/db";
import { errorJson, json } from "@/lib/http";
import { requireViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await params;
  const photos = await sql<{ id: string }>("select id from photos where id = $1", [id]);
  if (!photos[0]) return errorJson("Photo not found", 404);

  const existing = await sql<{ photo_id: string }>(
    "select photo_id from likes where photo_id = $1 and user_id = $2",
    [id, viewer.id],
  );
  if (existing[0]) {
    await sql("delete from likes where photo_id = $1 and user_id = $2", [id, viewer.id]);
  } else {
    await sql("insert into likes (photo_id, user_id) values ($1,$2)", [id, viewer.id]);
  }
  const count = await sql<{ n: number }>(
    "select count(*)::int as n from likes where photo_id = $1",
    [id],
  );
  return json({ liked: !existing[0], likeCount: count[0]?.n ?? 0 });
}
