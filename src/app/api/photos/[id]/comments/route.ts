import { sql } from "@/lib/db";
import { clampText, errorJson, json } from "@/lib/http";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  const { id } = await params;
  const comments = await sql<{
    id: string;
    user_id: string;
    user_name: string;
    body: string;
    created_at: string;
  }>("select id, user_id, user_name, body, created_at from comments where photo_id = $1 order by created_at asc", [
    id,
  ]);
  return json(
    {
      comments: comments.map((c) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user_name,
        body: c.body,
        createdAt: c.created_at,
      })),
    },
    {},
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  const { id } = await params;
  const photos = await sql<{ id: string }>("select id from photos where id = $1", [id]);
  if (!photos[0]) return errorJson("Photo not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("Invalid JSON");
  }
  const text = clampText(
    body && typeof body === "object" && "body" in body ? (body as { body: unknown }).body : "",
    500,
  );
  if (text.length < 1) return errorJson("Comment cannot be empty");

  const commentId = crypto.randomUUID();
  await sql(
    "insert into comments (id, photo_id, user_id, user_name, body) values ($1,$2,$3,$4,$5)",
    [commentId, id, viewer.id, viewer.name, text],
  );
  return json(
    {
      comment: {
        id: commentId,
        userId: viewer.id,
        userName: viewer.name,
        body: text,
        createdAt: new Date().toISOString(),
      },
    },
    { status: 201 },
    viewer.setCookie ? { "set-cookie": viewer.setCookie } : undefined,
  );
}
