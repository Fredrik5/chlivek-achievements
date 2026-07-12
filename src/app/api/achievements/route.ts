import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { getApprovedTotal, nextThreshold } from "@/lib/points";

export async function GET() {
  try {
    const user = await requireUser();

    const [achievements, mySubmissions, totalPoints] = await Promise.all([
      prisma.achievement.findMany({
        where: { isSecret: false, isActive: true },
        include: { category: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.submission.findMany({
        where: { userId: user.id, status: { in: ["pending", "approved"] } },
        orderBy: { submittedAt: "desc" },
      }),
      getApprovedTotal(user.id),
    ]);

    const byAchievement = new Map(mySubmissions.map((s) => [s.achievementId, s]));

    const items = achievements.map((a) => {
      const submission = byAchievement.get(a.id);
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        points: a.points,
        categoryId: a.categoryId,
        categoryName: a.category?.name ?? "Ostatní",
        iconPath: a.iconPath,
        status: submission ? submission.status : "undone",
        submissionId: submission?.id ?? null,
      };
    });

    return NextResponse.json({
      totalPoints,
      nextMilestone: nextThreshold(totalPoints),
      achievements: items,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
