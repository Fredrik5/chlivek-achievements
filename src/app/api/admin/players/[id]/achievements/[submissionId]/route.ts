import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    await requireAdmin();
    const { id: playerId, submissionId } = await params;

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.userId !== playerId) {
      return NextResponse.json({ error: "Záznam nenalezen." }, { status: 404 });
    }

    if (submission.photoPath) {
      const filePath = path.join(process.cwd(), "public", submission.photoPath);
      await fs.unlink(filePath).catch(() => {});
    }
    // Cascades to delete the linked SecretDraw row too, if this was a
    // secret-draw grant — freeing the threshold for the player to redraw.
    await prisma.submission.delete({ where: { id: submissionId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
