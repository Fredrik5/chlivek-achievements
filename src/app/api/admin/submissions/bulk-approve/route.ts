import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Nic není vybráno." }, { status: 400 });
    }

    const result = await prisma.submission.updateMany({
      where: { id: { in: ids }, status: "pending" },
      data: { status: "approved", reviewedAt: new Date(), reviewedById: admin.id },
    });

    return NextResponse.json({ approved: result.count });
  } catch (err) {
    return handleApiError(err);
  }
}
