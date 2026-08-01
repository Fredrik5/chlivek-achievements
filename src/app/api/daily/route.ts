import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { todayDateString } from "@/lib/date";

export async function GET() {
  try {
    const user = await requireUser();
    const today = todayDateString();

    const [todayAchievement, pastAchievements] = await Promise.all([
      prisma.achievement.findFirst({
        where: { isDaily: true, isActive: true, dailyDate: today },
      }),
      prisma.achievement.findMany({
        where: { isDaily: true, isActive: true, dailyDate: { lt: today } },
        orderBy: { dailyDate: "desc" },
      }),
    ]);

    const relevantIds = [
      ...(todayAchievement ? [todayAchievement.id] : []),
      ...pastAchievements.map((a) => a.id),
    ];
    const submissions = relevantIds.length
      ? await prisma.submission.findMany({
          where: {
            userId: user.id,
            achievementId: { in: relevantIds },
            status: { in: ["pending", "approved"] },
          },
        })
      : [];
    const byAchievement = new Map(submissions.map((s) => [s.achievementId, s]));

    const today_ = todayAchievement
      ? {
          id: todayAchievement.id,
          title: todayAchievement.title,
          description: todayAchievement.description,
          points: todayAchievement.points,
          iconPath: todayAchievement.iconPath,
          requiresApproval: todayAchievement.requiresApproval,
          status: byAchievement.get(todayAchievement.id)?.status ?? "undone",
        }
      : null;

    const history = pastAchievements.map((a) => {
      const submission = byAchievement.get(a.id);
      return {
        id: a.id,
        title: a.title,
        dailyDate: a.dailyDate as string,
        points: a.points,
        iconPath: a.iconPath,
        status: submission ? submission.status : "missed",
      };
    });

    return NextResponse.json({ today: today_, history });
  } catch (err) {
    return handleApiError(err);
  }
}
