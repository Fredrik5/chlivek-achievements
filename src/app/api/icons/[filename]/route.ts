import path from "node:path";
import { serveUploadedFile } from "@/lib/serveUploadedFile";

const ICON_DIR = path.join(process.cwd(), "public", "icons");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return serveUploadedFile(ICON_DIR, filename);
}
