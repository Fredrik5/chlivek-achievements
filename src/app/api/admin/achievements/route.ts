import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const isSecret = request.nextUrl.searchParams.get("secret") === "true";

    const achievements = await prisma.achievement.findMany({
      where: { isSecret },
      include: { category: true, _count: { select: { submissions: { where: { status: "approved" } } } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      achievements: achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        points: a.points,
        categoryId: a.categoryId,
        categoryName: a.category?.name ?? null,
        isSecret: a.isSecret,
        requiresApproval: a.requiresApproval,
        isActive: a.isActive,
        iconPath: a.iconPath,
        completedCount: a._count.submissions,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const points = Number(body.points);
    const isSecret = !!body.isSecret;
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
    const requiresApproval =
      typeof body.requiresApproval === "boolean" ? body.requiresApproval : !isSecret;

    if (!title || !description || !Number.isFinite(points) || points <= 0) {
      return NextResponse.json({ error: "Vyplň název, popis a kladný počet bodů." }, { status: 400 });
    }
    if (!isSecret && !categoryId) {
      return NextResponse.json({ error: "Vyber kategorii." }, { status: 400 });
    }

    const achievement = await prisma.achievement.create({
      data: {
        title,
        description,
        points: Math.round(points),
        isSecret,
        categoryId: isSecret ? null : categoryId,
        requiresApproval,
      },
    });

    return NextResponse.json({ achievement });
  } catch (err) {
    return handleApiError(err);
  }
}
