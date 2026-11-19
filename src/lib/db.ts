import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const g = globalThis as typeof globalThis & {
  __skatespotterPool?: pg.Pool;
  __skatespotterLocal?: Promise<PGlite>;
};

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    g.__skatespotterPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await g.__skatespotterPool.query(text, params)).rows as T[];
  }
  g.__skatespotterLocal ??= startLocal().catch((error: unknown) => {
    g.__skatespotterLocal = undefined;
    throw error;
  });
  return (await (await g.__skatespotterLocal).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}

export function asBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value, "base64");
  throw new Error("unsupported byte value");
}
