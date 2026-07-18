import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  svg: "image/svg+xml",
};

// public/ is served from the build-time snapshot in this Next.js version, so files
// written at runtime (user uploads) need to be read from disk on every request instead.
export async function serveUploadedFile(dir: string, filename: string) {
  const filePath = path.join(dir, filename);
  if (path.dirname(filePath) !== dir) {
    return NextResponse.json({ error: "Neplatný soubor." }, { status: 400 });
  }

  try {
    const bytes = await fs.readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Soubor nenalezen." }, { status: 404 });
  }
}
