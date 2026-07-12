import { NextRequest, NextResponse } from "next/server";
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Zadej název kategorie." }, { status: 400 });
    }
    const category = await prisma.category.update({ where: { id }, data: { name } });
    return NextResponse.json({ category: { id: category.id, name: category.name } });
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
    const count = await prisma.achievement.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: "Kategorie obsahuje achievementy, nelze ji smazat." },
        { status: 409 },
      );
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
