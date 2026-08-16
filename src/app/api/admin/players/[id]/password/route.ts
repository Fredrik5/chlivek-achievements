import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: playerId } = await params;
    const body = await request.json();
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const player = await prisma.user.findUnique({ where: { id: playerId } });
    if (!player || player.username === "gm") {
      return NextResponse.json({ error: "Hráč nenalezen." }, { status: 404 });
    }

    if (!newPassword) {
      return NextResponse.json({ error: "Zadej nové heslo." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: playerId }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId: playerId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
