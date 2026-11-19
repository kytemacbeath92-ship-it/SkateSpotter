import { createProfile, getProfile, parseProfileDraft, requireViewer } from "@/lib/viewer";
import { errorJson, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const existing = await getProfile(viewer.id, viewer.simulated, viewer.name);
  if (existing.complete) {
    return errorJson("Profile already exists", 409);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("Invalid JSON");
  }
  const draft = parseProfileDraft(body);
  if (typeof draft === "string") return errorJson(draft);
  const profile = await createProfile(viewer.id, draft, viewer.simulated);
  if (!profile.complete) {
    return errorJson("Could not save profile", 500);
  }
  return json(
    {
      complete: true,
      name: profile.name,
      fullName: profile.fullName,
      age: profile.age,
      city: profile.city,
      country: profile.country,
      contact: profile.contact,
      ride: profile.ride,
      simulated: profile.simulated,
    },
    { status: 201 },
  );
}
