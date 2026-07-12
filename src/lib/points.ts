import { prisma } from "./db";

// Points only count once a submission is approved (either by an admin, or
// automatically at creation time for achievements with requiresApproval =
// false — see submitAchievement in achievements.ts). There's no cached
// total column: it's always summed live from approved submissions, so it
// can never drift out of sync with the approval queue.
export async function getApprovedTotal(userId: string): Promise<number> {
  const submissions = await prisma.submission.findMany({
    where: { userId, status: "approved" },
    select: { achievement: { select: { points: true } } },
  });
  return submissions.reduce((sum, s) => sum + s.achievement.points, 0);
}

export async function getApprovedTotalToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const submissions = await prisma.submission.findMany({
    where: { userId, status: "approved", reviewedAt: { gte: startOfDay } },
    select: { achievement: { select: { points: true } } },
  });
  return submissions.reduce((sum, s) => sum + s.achievement.points, 0);
}

export function nextThreshold(total: number): number {
  return Math.max(100, Math.ceil((total + 1) / 100) * 100);
}

// Every 100-point milestone the player has crossed, ascending.
export function reachedThresholds(total: number): number[] {
  const count = Math.floor(total / 100);
  return Array.from({ length: count }, (_, i) => (i + 1) * 100);
}
