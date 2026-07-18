interface ResizeImageOptions {
  maxDimension: number;
  quality?: number;
}

// Phone camera photos routinely exceed server upload limits and can arrive in
// formats browsers other than Safari/iOS can't render (e.g. HEIC). Re-encoding
// through a canvas downscales the image and normalizes it to JPEG/PNG.
// Throws if the browser can't decode the source file (caller decides the fallback).
export async function resizeImageFile(file: File, { maxDimension, quality = 0.85 }: ResizeImageOptions): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("Canvas export failed");

  const ext = type === "image/jpeg" ? "jpg" : "png";
  const name = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
  return new File([blob], name, { type });
}
