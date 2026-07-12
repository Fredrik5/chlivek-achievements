import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { getApprovedTotal } from "@/lib/points";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const threshold = Number(body.threshold);

    if (!Number.isInteger(threshold) || threshold <= 0 || threshold % 100 !== 0) {
      return NextResponse.json({ error: "Neplatný práh." }, { status: 400 });
    }

    const total = await getApprovedTotal(user.id);
    if (total < threshold) {
      return NextResponse.json(
        { error: "Na tento práh ještě nemáš dost bodů." },
        { status: 400 },
      );
    }

    const already = await prisma.secretDraw.findUnique({
      where: { userId_threshold: { userId: user.id, threshold } },
    });
    if (already) {
      return NextResponse.json(
        { error: "Na tento práh už jsi losoval/a." },
        { status: 409 },
      );
    }

    const usedIds = (
      await prisma.secretDraw.findMany({ where: { userId: user.id }, select: { achievementId: true } })
    ).map((d) => d.achievementId);

    let pool = await prisma.achievement.findMany({
      where: { isSecret: true, isActive: true, id: { notIn: usedIds } },
    });
    // Per-player pool exhausted (fewer secret achievements than thresholds
    // reached) — fall back to allowing a repeat, same as the design mock.
    if (pool.length === 0) {
      pool = await prisma.achievement.findMany({ where: { isSecret: true, isActive: true } });
    }
    if (pool.length === 0) {
      return NextResponse.json(
        { error: "Není nastaven žádný tajný achievement." },
        { status: 500 },
      );
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];

    try {
      await prisma.$transaction(async (tx) => {
        const autoApprove = !pick.requiresApproval;
        const now = new Date();
        const submission = await tx.submission.create({
          data: {
            userId: user.id,
            achievementId: pick.id,
            source: "secret_draw",
            status: autoApprove ? "approved" : "pending",
            reviewedAt: autoApprove ? now : null,
          },
        });
        await tx.secretDraw.create({
          data: { userId: user.id, threshold, achievementId: pick.id, submissionId: submission.id },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json(
          { error: "Na tento práh už jsi losoval/a." },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({
      threshold,
      achievement: {
        title: pick.title,
        description: pick.description,
        points: pick.points,
        iconPath: pick.iconPath,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
