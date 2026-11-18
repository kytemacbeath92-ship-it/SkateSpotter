const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2_000_000;

export function parseDataUrl(dataUrl: unknown): { mime: string; bytes: Buffer } {
  if (typeof dataUrl !== "string") {
    throw new Error("Photo data is required");
  }
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(
    dataUrl.replace(/\s/g, ""),
  );
  if (!match) {
    throw new Error("Photos must be JPEG, PNG, WebP, or GIF");
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED.has(mime)) {
    throw new Error("Photos must be JPEG, PNG, WebP, or GIF");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) {
    throw new Error("Photo is empty");
  }
  if (bytes.length > MAX_BYTES) {
    throw new Error("Each photo must be under 2 MB");
  }
  return { mime, bytes };
}
