import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { getApprovedTotal, nextThreshold, reachedThresholds } from "@/lib/points";

export async function GET() {
  try {
    const user = await requireUser();
    const total = await getApprovedTotal(user.id);
    const reached = reachedThresholds(total);
    const upcoming = nextThreshold(total);

    const draws = await prisma.secretDraw.findMany({
      where: { userId: user.id },
      include: { achievement: true },
    });
    const drawnByThreshold = new Map(draws.map((d) => [d.threshold, d]));

    const drawnAchievementIds = draws.map((d) => d.achievementId);
    const submissions = drawnAchievementIds.length
      ? await prisma.submission.findMany({
          where: { userId: user.id, achievementId: { in: drawnAchievementIds } },
          orderBy: { submittedAt: "asc" },
        })
      : [];
    const submissionByAchievement = new Map(submissions.map((s) => [s.achievementId, s]));

    const thresholds = [...reached, upcoming];
    const slots = thresholds.map((threshold) => {
      const draw = drawnByThreshold.get(threshold);
      if (draw) {
        return {
          threshold,
          state: "revealed" as const,
          achievement: {
            id: draw.achievementId,
            title: draw.achievement.title,
            description: draw.achievement.description,
            points: draw.achievement.points,
            iconPath: draw.achievement.iconPath,
          },
          submissionStatus: submissionByAchievement.get(draw.achievementId)?.status,
        };
      }
      if (total >= threshold) {
        return { threshold, state: "available" as const };
      }
      return { threshold, state: "locked" as const };
    });

    return NextResponse.json({
      points: total,
      nextThreshold: upcoming,
      hasAvailableNow: slots.some((s) => s.state === "available"),
      slots,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
