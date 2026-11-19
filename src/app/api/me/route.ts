import { getProfile, requireViewer, setDisplayName } from "@/lib/viewer";
import { clampText, errorJson, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const fallback = viewer.name;
  const profile = await getProfile(viewer.id, viewer.simulated, fallback);
  return json({
    complete: profile.complete,
    name: profile.name,
    fullName: profile.fullName,
    age: profile.age,
    city: profile.city,
    country: profile.country,
    contact: profile.contact,
    ride: profile.ride,
    simulated: profile.simulated,
  });
}

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const existing = await getProfile(viewer.id, viewer.simulated, viewer.name);
  if (!existing.complete) {
    return errorJson("Create your profile first");
  }
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
  return json({
    complete: true,
    name: saved,
    simulated: viewer.simulated,
  });
}
