import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const data: {
      title?: string;
      description?: string;
      points?: number;
      categoryId?: string | null;
      requiresApproval?: boolean;
      isActive?: boolean;
    } = {};

    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === "string" && body.description.trim())
      data.description = body.description.trim();
    if (body.points !== undefined) {
      const points = Number(body.points);
      if (!Number.isFinite(points) || points <= 0) {
        return NextResponse.json({ error: "Body musí být kladné číslo." }, { status: 400 });
      }
      data.points = Math.round(points);
    }
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (typeof body.requiresApproval === "boolean") data.requiresApproval = body.requiresApproval;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const achievement = await prisma.achievement.update({ where: { id }, data });
    return NextResponse.json({ achievement });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (achievement?.iconPath) {
      await fs.unlink(path.join(process.cwd(), "public", achievement.iconPath)).catch(() => {});
    }
    await prisma.achievement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
