import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const [settings, playersCount, pendingCount, activeAchievementsCount, secretDrawsCount] =
      await Promise.all([
        prisma.eventSettings.findUnique({ where: { id: 1 } }),
        prisma.user.count({ where: { role: "player" } }),
        prisma.submission.count({ where: { status: "pending" } }),
        prisma.achievement.count({ where: { isSecret: false, isActive: true } }),
        prisma.secretDraw.count(),
      ]);

    return NextResponse.json({
      eventName: settings?.eventName ?? "",
      leaderboardVisible: settings?.leaderboardVisible ?? true,
      stats: { playersCount, pendingCount, activeAchievementsCount, secretDrawsCount },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const data: { eventName?: string; leaderboardVisible?: boolean } = {};
    if (typeof body.eventName === "string" && body.eventName.trim()) {
      data.eventName = body.eventName.trim().slice(0, 120);
    }
    if (typeof body.leaderboardVisible === "boolean") {
      data.leaderboardVisible = body.leaderboardVisible;
    }

    const settings = await prisma.eventSettings.update({ where: { id: 1 }, data });
    return NextResponse.json({
      eventName: settings.eventName,
      leaderboardVisible: settings.leaderboardVisible,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
