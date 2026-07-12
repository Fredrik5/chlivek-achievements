import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const onlySecret = request.nextUrl.searchParams.get("filter") === "secret";

    const submissions = await prisma.submission.findMany({
      where: {
        status: "pending",
        ...(onlySecret ? { achievement: { isSecret: true } } : {}),
      },
      include: { user: true, achievement: true },
      orderBy: { submittedAt: "asc" },
    });

    return NextResponse.json({
      queue: submissions.map((s) => ({
        id: s.id,
        player: s.user.username,
        playerId: s.userId,
        achievementTitle: s.achievement.title,
        achievementIconPath: s.achievement.iconPath,
        points: s.achievement.points,
        isSecret: s.achievement.isSecret,
        note: s.note,
        hasPhoto: !!s.photoPath,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
