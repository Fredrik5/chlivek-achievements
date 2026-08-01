import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const direction = body.direction;

    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Neplatný směr." }, { status: 400 });
    }

    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const siblings = await prisma.achievement.findMany({
      where: { categoryId: achievement.categoryId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    const index = siblings.findIndex((s) => s.id === id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    const neighbor = siblings[neighborIndex];

    if (!neighbor) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction([
      prisma.achievement.update({ where: { id: achievement.id }, data: { order: neighbor.order } }),
      prisma.achievement.update({ where: { id: neighbor.id }, data: { order: achievement.order } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
