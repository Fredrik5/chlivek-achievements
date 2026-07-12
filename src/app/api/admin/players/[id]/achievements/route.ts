import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id: playerId } = await params;
    const body = await request.json();
    const achievementId = typeof body.achievementId === "string" ? body.achievementId : "";

    const player = await prisma.user.findUnique({ where: { id: playerId } });
    if (!player || player.role !== "player") {
      return NextResponse.json({ error: "Hráč nenalezen." }, { status: 404 });
    }
    const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!achievement) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const existing = await prisma.submission.findFirst({
      where: { userId: playerId, achievementId, status: { in: ["pending", "approved"] } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Hráč už má na tento achievement aktivní žádost." },
        { status: 409 },
      );
    }

    const submission = await prisma.submission.create({
      data: {
        userId: playerId,
        achievementId,
        source: "admin_manual",
        status: "approved",
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });

    return NextResponse.json({ submissionId: submission.id });
  } catch (err) {
    return handleApiError(err);
  }
}
