import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let photoInfo: { name: string; type: string; size: number } | null = null;
  try {
    const user = await requireUser();

    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement || achievement.isSecret || !achievement.isActive) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const existing = await prisma.submission.findFirst({
      where: { userId: user.id, achievementId: id, status: { in: ["pending", "approved"] } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Na tento achievement už máš aktivní žádost." },
        { status: 409 },
      );
    }

    const form = await request.formData();
    const noteRaw = form.get("note");
    const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 1000) : null;

    const photo = form.get("photo");
    let photoPath: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      photoInfo = { name: photo.name, type: photo.type, size: photo.size };
      if (!photo.type.startsWith("image/")) {
        return NextResponse.json({ error: "Příloha musí být obrázek." }, { status: 400 });
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: "Fotka je moc velká (max 8 MB)." }, { status: 400 });
      }
      const ext = photo.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const bytes = Buffer.from(await photo.arrayBuffer());
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes);
      photoPath = `/uploads/${filename}`;
    }

    const autoApprove = !achievement.requiresApproval;
    const now = new Date();
    const submission = await prisma.submission.create({
      data: {
        userId: user.id,
        achievementId: id,
        note,
        photoPath,
        source: "player",
        status: autoApprove ? "approved" : "pending",
        reviewedAt: autoApprove ? now : null,
      },
    });

    return NextResponse.json({ submission: { id: submission.id, status: submission.status } });
  } catch (err) {
    console.error(`[achievements/${id}/submit] failed`, { photoInfo }, err);
    return handleApiError(err);
  }
}
