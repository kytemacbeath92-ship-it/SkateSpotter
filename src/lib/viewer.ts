import "server-only";
import { requireIdentity } from "../../cursor/identity.js";
import { sql } from "./db";
import { clampText } from "./http";

export type Viewer = {
  id: string;
  name: string;
  simulated: boolean;
};

export async function requireViewer(request: Request): Promise<Viewer | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  const fallback = identity.kind === "key" ? identity.name || "API" : identity.name || "Skater";
  const name = await profileName(identity.sub, fallback);
  return { id: identity.sub, name, simulated: Boolean(identity.simulated) };
}

export async function requireSignedIn(request: Request): Promise<Response | null> {
  const viewer = await requireViewer(request);
  return viewer instanceof Response ? viewer : null;
}

export async function setDisplayName(userId: string, name: string) {
  const displayName = clampText(name, 40) || "Skater";
  await sql(
    `insert into profiles (user_id, display_name, updated_at)
     values ($1, $2, now())
     on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now()`,
    [userId, displayName],
  );
  return displayName;
}

async function profileName(userId: string, fallback: string) {
  const rows = await sql<{ display_name: string }>(
    "select display_name from profiles where user_id = $1",
    [userId],
  );
  return rows[0]?.display_name?.trim() || fallback;
}
