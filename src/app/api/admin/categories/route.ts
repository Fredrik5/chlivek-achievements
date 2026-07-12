import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { achievements: true } } },
    });
    return NextResponse.json({
      categories: categories.map((c) => ({ id: c.id, name: c.name, count: c._count.achievements })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Zadej název kategorie." }, { status: 400 });
    }
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Kategorie s tímto názvem už existuje." }, { status: 409 });
    }
    const category = await prisma.category.create({ data: { name } });
    return NextResponse.json({ category: { id: category.id, name: category.name, count: 0 } });
  } catch (err) {
    return handleApiError(err);
  }
}
