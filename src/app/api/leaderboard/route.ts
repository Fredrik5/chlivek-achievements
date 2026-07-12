import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { getApprovedTotal, getApprovedTotalToday } from "@/lib/points";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const settings = await prisma.eventSettings.findUnique({ where: { id: 1 } });
    const visible = settings?.leaderboardVisible ?? true;

    if (!visible && user.role !== "admin") {
      return NextResponse.json({ visible: false });
    }

    const filter = request.nextUrl.searchParams.get("filter") === "today" ? "today" : "all";
    const players = await prisma.user.findMany({
      where: { role: "player" },
      select: { id: true, username: true },
    });

    const rows = await Promise.all(
      players.map(async (p) => {
        const points =
          filter === "today" ? await getApprovedTotalToday(p.id) : await getApprovedTotal(p.id);
        const [approvedCount, pendingCount] = await Promise.all([
          prisma.submission.count({ where: { userId: p.id, status: "approved" } }),
          prisma.submission.count({ where: { userId: p.id, status: "pending" } }),
        ]);
        return { id: p.id, name: p.username, points, approvedCount, pendingCount, isMe: p.id === user.id };
      }),
    );

    rows.sort((a, b) => b.points - a.points);
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));

    return NextResponse.json({
      visible: true,
      filter,
      eventName: settings?.eventName ?? "",
      players: ranked,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
