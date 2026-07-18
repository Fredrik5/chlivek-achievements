import path from "node:path";
import { serveUploadedFile } from "@/lib/serveUploadedFile";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return serveUploadedFile(UPLOAD_DIR, filename);
}
