import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission || submission.status !== "pending") {
      return NextResponse.json({ error: "Žádost nenalezena nebo už byla vyřízena." }, { status: 404 });
    }

    await prisma.submission.update({
      where: { id },
      data: {
        status: "rejected",
        rejectReason: reason,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
