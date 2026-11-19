import { requireViewer, setDisplayName } from "@/lib/viewer";
import { clampText, errorJson, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  return json({ name: viewer.name, simulated: viewer.simulated });
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
  const name = clampText(
    body && typeof body === "object" && "name" in body ? (body as { name: unknown }).name : "",
    40,
  );
  if (name.length < 2) {
    return errorJson("Name must be at least 2 characters");
  }
  const saved = await setDisplayName(viewer.id, name);
  return json({ name: saved, simulated: viewer.simulated });
}
