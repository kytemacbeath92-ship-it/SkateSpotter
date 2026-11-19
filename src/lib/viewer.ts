import "server-only";
import { requireIdentity } from "../../cursor/identity.js";
import { sql } from "./db";
import { clampText } from "./http";
import { RIDES, type Ride } from "./limits";

export type Viewer = {
  id: string;
  name: string;
  simulated: boolean;
};

export type Profile = {
  complete: boolean;
  name: string;
  fullName: string;
  age: number | null;
  city: string;
  country: string;
  contact: string;
  ride: Ride | "";
  simulated: boolean;
};

export type ProfileDraft = {
  fullName: string;
  age: number;
  city: string;
  country: string;
  contact: string;
  username: string;
  ride: Ride;
};

type ProfileRow = {
  display_name: string;
  full_name: string;
  age: number | null;
  city: string;
  country: string;
  contact: string;
  ride: string;
  complete: boolean;
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

export async function getProfile(userId: string, simulated: boolean, fallbackName: string): Promise<Profile> {
  const rows = await sql<ProfileRow>(
    `select display_name, full_name, age, city, country, contact, ride, complete
     from profiles where user_id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) {
    return {
      complete: false,
      name: fallbackName,
      fullName: "",
      age: null,
      city: "",
      country: "",
      contact: "",
      ride: "",
      simulated,
    };
  }
  return {
    complete: Boolean(row.complete),
    name: row.display_name?.trim() || fallbackName,
    fullName: row.full_name ?? "",
    age: row.age,
    city: row.city ?? "",
    country: row.country ?? "",
    contact: row.contact ?? "",
    ride: isRide(row.ride) ? row.ride : "",
    simulated,
  };
}

export async function createProfile(userId: string, draft: ProfileDraft, simulated: boolean): Promise<Profile> {
  await sql(
    `insert into profiles (
       user_id, display_name, full_name, age, city, country, contact, ride, complete, updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,true,now())
     on conflict (user_id) do update set
       display_name = excluded.display_name,
       full_name = excluded.full_name,
       age = excluded.age,
       city = excluded.city,
       country = excluded.country,
       contact = excluded.contact,
       ride = excluded.ride,
       complete = true,
       updated_at = now()
     where profiles.complete = false`,
    [
      userId,
      draft.username,
      draft.fullName,
      draft.age,
      draft.city,
      draft.country,
      draft.contact,
      draft.ride,
    ],
  );
  return getProfile(userId, simulated, draft.username);
}

export async function setDisplayName(userId: string, name: string) {
  const displayName = clampText(name, 40) || "Skater";
  await sql(
    `update profiles set display_name = $2, updated_at = now() where user_id = $1 and complete = true`,
    [userId, displayName],
  );
  return displayName;
}

export function parseProfileDraft(body: unknown): ProfileDraft | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const input = body as Record<string, unknown>;
  const fullName = clampText(input.fullName, 80);
  const username = clampText(input.username, 40);
  const city = clampText(input.city, 80);
  const country = clampText(input.country, 80);
  const contact = clampText(input.contact, 80);
  const ride = typeof input.ride === "string" ? input.ride.trim().toLowerCase() : "";
  const ageRaw = typeof input.age === "number" ? input.age : Number(input.age);
  if (fullName.length < 2) return "Name must be at least 2 characters";
  if (username.length < 2) return "Screen name must be at least 2 characters";
  if (!Number.isInteger(ageRaw) || ageRaw < 13 || ageRaw > 120) {
    return "Age must be 13 or older";
  }
  if (city.length < 2) return "City is required";
  if (country.length < 2) return "Country is required";
  if (!validContact(contact)) return "Enter an email or phone number";
  if (!isRide(ride)) return "Pick what you ride";
  return { fullName, age: ageRaw, city, country, contact, username, ride };
}

async function profileName(userId: string, fallback: string) {
  const rows = await sql<{ display_name: string }>(
    "select display_name from profiles where user_id = $1",
    [userId],
  );
  return rows[0]?.display_name?.trim() || fallback;
}

function isRide(value: string): value is Ride {
  return (RIDES as readonly string[]).includes(value);
}

function validContact(value: string) {
  if (value.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^\+?[0-9()\s.-]+$/.test(value);
}
