export async function fileToDataUrl(file: File, maxEdge = 1400, quality = 0.82): Promise<string> {
  const bitmap = await (typeof createImageBitmap === "function"
    ? createImageBitmap(file)
    : loadBitmap(file));
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read photo");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, quality);
  if (dataUrl.length > 2_700_000) {
    return canvas.toDataURL("image/jpeg", 0.7);
  }
  return dataUrl;
}

function loadBitmap(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read photo"));
        return;
      }
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      createImageBitmap(canvas).then(resolve, reject);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read photo"));
    };
    image.src = url;
  });
}
