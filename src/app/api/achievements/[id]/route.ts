import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!achievement || achievement.isSecret) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const submission = await prisma.submission.findFirst({
      where: { userId: user.id, achievementId: id, status: { in: ["pending", "approved"] } },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({
      achievement: {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        points: achievement.points,
        categoryName: achievement.category?.name ?? "Ostatní",
        iconPath: achievement.iconPath,
        requiresApproval: achievement.requiresApproval,
      },
      status: submission?.status ?? "undone",
      submission: submission
        ? {
            id: submission.id,
            note: submission.note,
            photoPath: submission.photoPath,
            reviewedAt: submission.reviewedAt,
          }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
