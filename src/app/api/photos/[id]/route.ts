import { asBuffer, sql } from "@/lib/db";
import { errorJson } from "@/lib/http";
import { requireSignedIn } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireSignedIn(request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return errorJson("Not found", 404);
  }
  const rows = await sql<{ mime_type: string; bytes: unknown }>(
    "select mime_type, bytes from photos where id = $1",
    [id],
  );
  const photo = rows[0];
  if (!photo) return errorJson("Not found", 404);
  const bytes = asBuffer(photo.bytes);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": photo.mime_type,
      "cache-control": "private, max-age=3600",
    },
  });
}
