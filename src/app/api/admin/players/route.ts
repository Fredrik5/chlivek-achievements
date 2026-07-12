import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { getApprovedTotal } from "@/lib/points";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    const players = await prisma.user.findMany({
      where: {
        role: "player",
        ...(search ? { username: { contains: search } } : {}),
      },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    });

    const rows = await Promise.all(
      players.map(async (p) => ({ id: p.id, name: p.username, points: await getApprovedTotal(p.id) })),
    );
    rows.sort((a, b) => b.points - a.points);

    return NextResponse.json({ players: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
