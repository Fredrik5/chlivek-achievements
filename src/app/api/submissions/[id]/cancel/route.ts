import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission || submission.userId !== user.id) {
      return NextResponse.json({ error: "Žádost nenalezena." }, { status: 404 });
    }
    if (submission.status !== "pending" && submission.status !== "approved") {
      return NextResponse.json(
        { error: "Tuto žádost nelze zrušit." },
        { status: 400 },
      );
    }

    if (submission.photoPath) {
      const filePath = path.join(process.cwd(), "public", submission.photoPath);
      await fs.unlink(filePath).catch(() => {});
    }
    await prisma.submission.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
