import "server-only";
import { getIdentity } from "../../cursor/identity.js";
import { sql } from "./db";
import { clampText } from "./http";

const COOKIE = "skatespotter_sid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Viewer = {
  id: string;
  name: string;
  simulated: boolean;
  setCookie?: string;
};

export async function getViewer(request: Request): Promise<Viewer> {
  const identity = await getIdentity(request);
  if (identity.verified) {
    const fallback = identity.kind === "key" ? identity.name || "API" : identity.name || "Skater";
    const name = await profileName(identity.sub, fallback);
    return { id: identity.sub, name, simulated: Boolean(identity.simulated) };
  }

  const cookies = parseCookie(request.headers.get("cookie") ?? "");
  let sid = cookies[COOKIE];
  let setCookie: string | undefined;
  if (!sid || !UUID.test(sid)) {
    sid = crypto.randomUUID();
    setCookie = `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
  }
  const id = `guest:${sid}`;
  const headerName = clampText(request.headers.get("x-display-name"), 40);
  const name = await profileName(id, headerName || "Skater");
  return { id, name, simulated: false, setCookie };
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

function parseCookie(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
