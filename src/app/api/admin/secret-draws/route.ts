import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const playerSearch = request.nextUrl.searchParams.get("player")?.trim() ?? "";
    const achievementId = request.nextUrl.searchParams.get("achievementId") ?? "";

    const draws = await prisma.secretDraw.findMany({
      where: {
        ...(achievementId ? { achievementId } : {}),
        ...(playerSearch
          ? { user: { username: { contains: playerSearch } } }
          : {}),
      },
      include: { user: true, achievement: true },
      orderBy: { drawnAt: "desc" },
    });

    return NextResponse.json({
      draws: draws.map((d) => ({
        id: d.id,
        player: d.user.username,
        secretTitle: d.achievement.title,
        threshold: d.threshold,
        drawnAt: d.drawnAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
