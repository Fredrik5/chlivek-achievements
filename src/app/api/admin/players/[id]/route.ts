import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { getApprovedTotal } from "@/lib/points";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const player = await prisma.user.findUnique({ where: { id } });
    if (!player || player.role !== "player") {
      return NextResponse.json({ error: "Hráč nenalezen." }, { status: 404 });
    }

    const submissions = await prisma.submission.findMany({
      where: { userId: id, status: "approved" },
      include: { achievement: true },
      orderBy: { reviewedAt: "desc" },
    });

    const achievements = submissions.map((s) => ({
      submissionId: s.id,
      title: s.achievement.title,
      points: s.achievement.points,
    }));

    const history = submissions
      .filter((s) => s.source === "admin_manual")
      .map((s) => ({
        label: `Ručně přidáno: ${s.achievement.title} (${s.achievement.points} b.)`,
        when: s.reviewedAt,
      }));

    return NextResponse.json({
      player: { id: player.id, name: player.username, points: await getApprovedTotal(id) },
      achievements,
      history,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
