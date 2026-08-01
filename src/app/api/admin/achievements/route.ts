import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { DAILY_DATE_REGEX, DUPLICATE_DAILY_DATE_ERROR } from "@/lib/date";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const isDailyFilter = request.nextUrl.searchParams.get("daily") === "true";
    const isSecret = request.nextUrl.searchParams.get("secret") === "true";

    const where = isDailyFilter ? { isDaily: true } : { isSecret, isDaily: false };

    const achievements = await prisma.achievement.findMany({
      where,
      include: { category: true, _count: { select: { submissions: { where: { status: "approved" } } } } },
      orderBy: isDailyFilter
        ? { dailyDate: "asc" }
        : isSecret
          ? { createdAt: "asc" }
          : [{ categoryId: "asc" }, { order: "asc" }],
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
        isDaily: a.isDaily,
        dailyDate: a.dailyDate,
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
    const isDaily = !!body.isDaily;
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
    const requiresApproval =
      typeof body.requiresApproval === "boolean" ? body.requiresApproval : !isSecret;
    const dailyDate = typeof body.dailyDate === "string" ? body.dailyDate : "";

    if (!title || !description || !Number.isFinite(points) || points <= 0) {
      return NextResponse.json({ error: "Vyplň název, popis a kladný počet bodů." }, { status: 400 });
    }
    if (isSecret && isDaily) {
      return NextResponse.json(
        { error: "Achievement nemůže být zároveň tajný a denní." },
        { status: 400 },
      );
    }
    if (!isSecret && !isDaily && !categoryId) {
      return NextResponse.json({ error: "Vyber kategorii." }, { status: 400 });
    }
    if (isDaily && !DAILY_DATE_REGEX.test(dailyDate)) {
      return NextResponse.json({ error: "Vyber datum pro denní achievement." }, { status: 400 });
    }

    const targetCategoryId = isSecret || isDaily ? null : categoryId;
    const maxOrder = await prisma.achievement.aggregate({
      _max: { order: true },
      where: { categoryId: targetCategoryId },
    });
    const order = (maxOrder._max.order ?? -1) + 1;

    try {
      const achievement = await prisma.achievement.create({
        data: {
          title,
          description,
          points: Math.round(points),
          isSecret,
          isDaily,
          dailyDate: isDaily ? dailyDate : null,
          categoryId: targetCategoryId,
          requiresApproval,
          order,
        },
      });
      return NextResponse.json({ achievement });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: DUPLICATE_DAILY_DATE_ERROR }, { status: 400 });
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
