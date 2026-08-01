# Daily Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "daily" achievement kind, scheduled by admins for one specific calendar day at a time, completable by players only on that day, surfaced on the Dashboard, with a browsable history of past days.

**Architecture:** Extend the existing `Achievement` model with `isDaily`/`dailyDate` fields (mirroring how `isSecret` already distinguishes achievement kinds) rather than adding new tables. Reuse the existing `Submission` model, admin achievement CRUD routes, and the generic achievement detail/submit pages — daily achievements are "just achievements" with an extra day-gate, not a parallel system.

**Tech Stack:** Next.js (App Router) route handlers, Prisma + SQLite (better-sqlite3 adapter), React client components, inline style objects using the project's CSS custom-property design tokens (no CSS-in-JS library, no Tailwind).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-daily-achievements-design.md`
- At most one daily achievement per calendar day — enforced via a DB unique constraint on `dailyDate`.
- Scheduling a day is optional — a day can pass with no daily achievement at all.
- Players can only submit a daily achievement while `dailyDate` equals today (Europe/Prague timezone). This is enforced only in the submit endpoint.
- Admins can retroactively grant a missed daily to a player via the existing manual-grant endpoint (`POST /api/admin/players/[id]/achievements`) — no server change needed there, only the admin UI's picker needs to include daily achievements as options.
- Future-dated daily achievements are invisible to players everywhere (dashboard, history, and direct detail URL) until their day arrives.
- No automated test suite exists in this repo. Verification is `npx tsc --noEmit` (must show no new errors) plus a manual check in the browser per task, described concretely in each task's steps.
- All player-facing and admin-facing UI copy is in Czech, matching the existing strings in the files being modified.
- Follow existing code conventions exactly: inline `style={{ ... }}` objects using `var(--token-name)`, the shared `apiFetch<T>()` helper for client requests, `handleApiError()` for route error handling, and `requireUser()`/`requireAdmin()` for auth.

---

### Task 1: Schema migration + date/validation helpers

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/date.ts`

**Interfaces:**
- Produces: `todayDateString(): string` — returns today's date as `"YYYY-MM-DD"` in the `Europe/Prague` timezone. Used by every later task that needs to compare against "today".
- Produces: `DAILY_DATE_REGEX: RegExp` — matches a strict `YYYY-MM-DD` string.
- Produces: `DUPLICATE_DAILY_DATE_ERROR: string` — the exact error message `"Pro tento den už existuje jiný denní achievement."`, used by Task 2's duplicate-date handling.
- Produces: Prisma fields `Achievement.isDaily: boolean` and `Achievement.dailyDate: string | null` available on every `prisma.achievement.*` call from here on.

- [ ] **Step 1: Add the new fields to the Prisma schema**

In `prisma/schema.prisma`, in the `Achievement` model, add two fields right after `isSecret`:

```prisma
model Achievement {
  id               String   @id @default(cuid())
  title            String
  description      String
  points           Int
  categoryId       String?
  isSecret         Boolean  @default(false)
  isDaily          Boolean  @default(false)
  dailyDate        String?  @unique
  requiresApproval Boolean  @default(true)
  isActive         Boolean  @default(true)
  iconPath         String?
  createdAt        DateTime @default(now())

  category    Category?    @relation(fields: [categoryId], references: [id])
  submissions Submission[]
  secretDraws SecretDraw[]

  @@index([categoryId])
  @@index([isSecret])
  @@index([isDaily])
}
```

Also update the doc-comment above the model to mention the new kind:

```prisma
// Normal achievements belong to a Category. Secret achievements (isSecret =
// true) are the hidden draw pool: they have no category and are never shown
// in the regular achievement list, only revealed via SecretDraw. Daily
// achievements (isDaily = true) also have no category; each is pinned to one
// calendar day via dailyDate ("YYYY-MM-DD", unique) and only completable by
// players while that day is current.
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name add_daily_achievements`

Expected: a new folder appears under `prisma/migrations/` (e.g.
`prisma/migrations/<timestamp>_add_daily_achievements/migration.sql`)
containing `ALTER TABLE "Achievement" ADD COLUMN "isDaily" ...` and
`ADD COLUMN "dailyDate" ...` plus a unique index on `dailyDate`. The command
exits without error and regenerates the Prisma client (`src/generated/prisma`).

- [ ] **Step 3: Create the date/validation helper module**

Create `src/lib/date.ts`:

```ts
const EVENT_TIMEZONE = "Europe/Prague";

// "YYYY-MM-DD" for "today" in the event's timezone, independent of the
// server's own OS timezone configuration.
export function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIMEZONE }).format(new Date());
}

export const DAILY_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const DUPLICATE_DAILY_DATE_ERROR = "Pro tento den už existuje jiný denní achievement.";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (the new file has no callers yet, so this only confirms
it compiles standalone and the regenerated Prisma client's types are valid).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/date.ts
git commit -m "feat: add isDaily/dailyDate fields for daily achievements"
```

---

### Task 2: Admin achievements API — daily create/edit/list

**Files:**
- Modify: `src/app/api/admin/achievements/route.ts`
- Modify: `src/app/api/admin/achievements/[id]/route.ts`

**Interfaces:**
- Consumes: `todayDateString` is not needed here, but `DAILY_DATE_REGEX` and `DUPLICATE_DAILY_DATE_ERROR` from `src/lib/date.ts` (Task 1).
- Produces: `GET /api/admin/achievements?daily=true` returning achievements with `isDaily: true`, ordered by `dailyDate asc`, each including `isDaily: boolean` and `dailyDate: string | null` fields (added to every row in this endpoint's response, including the existing `secret=true/false` variants). Later tasks (6, 7) rely on these two fields being present in every row of this endpoint's response.
- Produces: `POST /api/admin/achievements` and `PATCH /api/admin/achievements/[id]` accept `isDaily: boolean` (create only) and `dailyDate: string` (`YYYY-MM-DD`) in their JSON body.

- [ ] **Step 1: Update the GET handler to add `isDaily`/`dailyDate` to every response row and support `?daily=true`**

Replace the full contents of `src/app/api/admin/achievements/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { DAILY_DATE_REGEX, DUPLICATE_DAILY_DATE_ERROR } from "@/lib/date";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const isDailyFilter = request.nextUrl.searchParams.get("daily") === "true";
    const isSecret = request.nextUrl.searchParams.get("secret") === "true";

    const where = isDailyFilter ? { isDaily: true } : { isSecret, isDaily: false };

    const achievements = await prisma.achievement.findMany({
      where,
      include: { category: true, _count: { select: { submissions: { where: { status: "approved" } } } } },
      orderBy: isDailyFilter ? { dailyDate: "asc" } : { createdAt: "asc" },
    });

    return NextResponse.json({
      achievements: achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        points: a.points,
        categoryId: a.categoryId,
        categoryName: a.category?.name ?? null,
        isSecret: a.isSecret,
        isDaily: a.isDaily,
        dailyDate: a.dailyDate,
        requiresApproval: a.requiresApproval,
        isActive: a.isActive,
        iconPath: a.iconPath,
        completedCount: a._count.submissions,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const points = Number(body.points);
    const isSecret = !!body.isSecret;
    const isDaily = !!body.isDaily;
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : null;
    const requiresApproval =
      typeof body.requiresApproval === "boolean" ? body.requiresApproval : !isSecret;
    const dailyDate = typeof body.dailyDate === "string" ? body.dailyDate : "";

    if (!title || !description || !Number.isFinite(points) || points <= 0) {
      return NextResponse.json({ error: "Vyplň název, popis a kladný počet bodů." }, { status: 400 });
    }
    if (!isSecret && !isDaily && !categoryId) {
      return NextResponse.json({ error: "Vyber kategorii." }, { status: 400 });
    }
    if (isDaily && !DAILY_DATE_REGEX.test(dailyDate)) {
      return NextResponse.json({ error: "Vyber datum pro denní achievement." }, { status: 400 });
    }

    try {
      const achievement = await prisma.achievement.create({
        data: {
          title,
          description,
          points: Math.round(points),
          isSecret,
          isDaily,
          dailyDate: isDaily ? dailyDate : null,
          categoryId: isSecret || isDaily ? null : categoryId,
          requiresApproval,
        },
      });
      return NextResponse.json({ achievement });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: DUPLICATE_DAILY_DATE_ERROR }, { status: 400 });
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Update the PATCH handler to accept `dailyDate` rescheduling with the same duplicate handling**

Replace the full contents of `src/app/api/admin/achievements/[id]/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { DAILY_DATE_REGEX, DUPLICATE_DAILY_DATE_ERROR } from "@/lib/date";
import { Prisma } from "@/generated/prisma/client";

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
      dailyDate?: string;
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
    if (typeof body.dailyDate === "string") {
      if (!DAILY_DATE_REGEX.test(body.dailyDate)) {
        return NextResponse.json({ error: "Neplatné datum." }, { status: 400 });
      }
      data.dailyDate = body.dailyDate;
    }

    try {
      const achievement = await prisma.achievement.update({ where: { id }, data });
      return NextResponse.json({ achievement });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: DUPLICATE_DAILY_DATE_ERROR }, { status: 400 });
      }
      throw err;
    }
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
```

Note: `isDaily` itself is intentionally never accepted by PATCH (an
achievement's kind is immutable after creation, matching how `isSecret` is
already handled today — only `dailyDate` can be changed, to allow
rescheduling).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors in the two modified files.

- [ ] **Step 4: Manual check**

Start the dev server (`npm run dev`), log in as an admin, and use a REST
client or the browser devtools console (`fetch` with credentials) to:
- `POST /api/admin/achievements` with `{"title":"Test","description":"d","points":10,"isDaily":true,"dailyDate":"2026-08-02"}` → expect 200 with the created achievement including `isDaily: true, dailyDate: "2026-08-02"`.
- Repeat the same POST with the same `dailyDate` → expect 400 with message "Pro tento den už existuje jiný denní achievement."
- `GET /api/admin/achievements?daily=true` → expect the created achievement in the list.
- `GET /api/admin/achievements?secret=false` → expect the created daily achievement to be **absent**.
- Delete the test achievement afterward via `DELETE /api/admin/achievements/<id>` so it doesn't linger in the dev DB.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/achievements/route.ts src/app/api/admin/achievements/[id]/route.ts
git commit -m "feat: support daily achievements in admin CRUD API"
```

---

### Task 3: Player achievement APIs — daily support

**Files:**
- Modify: `src/app/api/achievements/route.ts`
- Modify: `src/app/api/achievements/[id]/route.ts`
- Modify: `src/app/api/achievements/[id]/submit/route.ts`

**Interfaces:**
- Consumes: `todayDateString()` from `src/lib/date.ts` (Task 1).
- Produces: `GET /api/achievements/[id]` response `status` field gains a new possible value `"missed"` (alongside existing `"undone" | "pending" | "approved"`). Task 10 (detail page) relies on this new value.
- Produces: `GET /api/achievements/[id]` response `achievement.categoryName` is `"Denní výzva"` for daily achievements.
- Produces: `POST /api/achievements/[id]/submit` returns 400 `{"error":"Tento den už uplynul."}` when called for a daily achievement outside its scheduled day.

- [ ] **Step 1: Exclude daily achievements from the dashboard feed**

In `src/app/api/achievements/route.ts`, change the `findMany` call's `where`
clause from:

```ts
      prisma.achievement.findMany({
        where: { isSecret: false, isActive: true },
        include: { category: true },
        orderBy: { createdAt: "asc" },
      }),
```

to:

```ts
      prisma.achievement.findMany({
        where: { isSecret: false, isDaily: false, isActive: true },
        include: { category: true },
        orderBy: { createdAt: "asc" },
      }),
```

- [ ] **Step 2: Hide future daily achievements and add the "missed" status in the detail endpoint**

Replace the full contents of `src/app/api/achievements/[id]/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { todayDateString } from "@/lib/date";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!achievement || achievement.isSecret) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const today = todayDateString();
    if (achievement.isDaily && achievement.dailyDate && achievement.dailyDate > today) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const submission = await prisma.submission.findFirst({
      where: { userId: user.id, achievementId: id, status: { in: ["pending", "approved"] } },
      orderBy: { submittedAt: "desc" },
    });

    const isMissedDaily =
      !submission && achievement.isDaily && !!achievement.dailyDate && achievement.dailyDate < today;

    return NextResponse.json({
      achievement: {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        points: achievement.points,
        categoryName: achievement.isDaily ? "Denní výzva" : achievement.category?.name ?? "Ostatní",
        iconPath: achievement.iconPath,
        requiresApproval: achievement.requiresApproval,
      },
      status: submission ? submission.status : isMissedDaily ? "missed" : "undone",
      submission: submission
        ? {
            id: submission.id,
            note: submission.note,
            photoPath: submission.photoPath,
            reviewedAt: submission.reviewedAt,
          }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 3: Enforce the "only on its day" rule in the submit endpoint**

In `src/app/api/achievements/[id]/submit/route.ts`, add the import and a new
check right after the existing achievement-lookup guard. Change:

```ts
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let photoInfo: { name: string; type: string; size: number } | null = null;
  try {
    const user = await requireUser();

    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement || achievement.isSecret || !achievement.isActive) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }
```

to:

```ts
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { todayDateString } from "@/lib/date";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let photoInfo: { name: string; type: string; size: number } | null = null;
  try {
    const user = await requireUser();

    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement || achievement.isSecret || !achievement.isActive) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }
    if (achievement.isDaily && achievement.dailyDate !== todayDateString()) {
      return NextResponse.json({ error: "Tento den už uplynul." }, { status: 400 });
    }
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

With the test daily achievement from Task 2 (recreate it with today's date
via `POST /api/admin/achievements` if you deleted it), as a logged-in player:
- `GET /api/achievements` → confirm the daily achievement does not appear.
- `GET /api/achievements/<dailyId>` → confirm `status: "undone"` and
  `achievement.categoryName: "Denní výzva"`.
- `POST /api/achievements/<dailyId>/submit` (empty form body) → expect 200,
  submission created/approved per `requiresApproval`.
- Edit the achievement's `dailyDate` via `PATCH /api/admin/achievements/<id>`
  to yesterday's date, then `GET /api/achievements/<dailyId>` again as a
  *different* player (or after cancelling the first submission) → confirm
  `status: "missed"`.
- Edit `dailyDate` to tomorrow, then `GET /api/achievements/<dailyId>` →
  expect 404.
- Clean up the test achievement afterward.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/achievements/route.ts src/app/api/achievements/[id]/route.ts src/app/api/achievements/[id]/submit/route.ts
git commit -m "feat: enforce daily achievement scheduling in player-facing API"
```

---

### Task 4: New GET /api/daily endpoint

**Files:**
- Create: `src/app/api/daily/route.ts`

**Interfaces:**
- Consumes: `todayDateString()` from `src/lib/date.ts` (Task 1).
- Produces: `GET /api/daily` → 
  ```ts
  {
    today: {
      id: string; title: string; description: string; points: number;
      iconPath: string | null; requiresApproval: boolean;
      status: "undone" | "pending" | "approved";
    } | null;
    history: {
      id: string; title: string; dailyDate: string; points: number;
      iconPath: string | null;
      status: "approved" | "pending" | "missed";
    }[];
  }
  ```
  Consumed by Task 8 (Dashboard) and Task 9 (history page).

- [ ] **Step 1: Write the endpoint**

Create `src/app/api/daily/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { todayDateString } from "@/lib/date";

export async function GET() {
  try {
    const user = await requireUser();
    const today = todayDateString();

    const [todayAchievement, pastAchievements] = await Promise.all([
      prisma.achievement.findFirst({
        where: { isDaily: true, isActive: true, dailyDate: today },
      }),
      prisma.achievement.findMany({
        where: { isDaily: true, isActive: true, dailyDate: { lt: today } },
        orderBy: { dailyDate: "desc" },
      }),
    ]);

    const relevantIds = [
      ...(todayAchievement ? [todayAchievement.id] : []),
      ...pastAchievements.map((a) => a.id),
    ];
    const submissions = relevantIds.length
      ? await prisma.submission.findMany({
          where: {
            userId: user.id,
            achievementId: { in: relevantIds },
            status: { in: ["pending", "approved"] },
          },
        })
      : [];
    const byAchievement = new Map(submissions.map((s) => [s.achievementId, s]));

    const today_ = todayAchievement
      ? {
          id: todayAchievement.id,
          title: todayAchievement.title,
          description: todayAchievement.description,
          points: todayAchievement.points,
          iconPath: todayAchievement.iconPath,
          requiresApproval: todayAchievement.requiresApproval,
          status: byAchievement.get(todayAchievement.id)?.status ?? "undone",
        }
      : null;

    const history = pastAchievements.map((a) => {
      const submission = byAchievement.get(a.id);
      return {
        id: a.id,
        title: a.title,
        dailyDate: a.dailyDate as string,
        points: a.points,
        iconPath: a.iconPath,
        status: submission ? submission.status : "missed",
      };
    });

    return NextResponse.json({ today: today_, history });
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

As a logged-in player, `GET /api/daily`:
- With no daily achievement scheduled for today → `{"today": null, "history": [...]}`.
- After creating one for today via the admin API → `today` populated with `status: "undone"`.
- With a past daily achievement present and no submission for it → appears in `history` with `status: "missed"`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/daily/route.ts
git commit -m "feat: add GET /api/daily endpoint for dashboard and history"
```

---

### Task 5: StatusPill "missed" support

**Files:**
- Modify: `src/components/ui/StatusPill.tsx`

**Interfaces:**
- Produces: `StatusPill`'s `status` prop accepts a new value `"missed"` (label "Zmeškáno"), in addition to the existing `"locked" | "pending" | "approved"`. Consumed by Task 9 and Task 10.

- [ ] **Step 1: Add the "missed" variant**

Replace the full contents of `src/components/ui/StatusPill.tsx` with:

```ts
type PillStatus = "locked" | "pending" | "approved" | "missed";

interface StatusPillProps {
  status: PillStatus;
  compact?: boolean;
}

const STATUS_STYLES: Record<
  PillStatus,
  { label: string; background: string; border: string; color: string }
> = {
  locked: {
    label: "Nesplněno",
    background: "var(--status-locked-bg)",
    border: "1px solid var(--status-locked-border)",
    color: "var(--status-locked-fg)",
  },
  pending: {
    label: "Čeká na schválení",
    background: "var(--status-pending-bg)",
    border: "1px solid var(--status-pending-border)",
    color: "var(--status-pending-fg)",
  },
  approved: {
    label: "Schváleno",
    background: "var(--status-approved-bg)",
    border: "1px solid var(--status-approved-border)",
    color: "var(--status-approved-fg)",
  },
  missed: {
    label: "Zmeškáno",
    background: "var(--status-locked-bg)",
    border: "1px solid var(--status-locked-border)",
    color: "var(--status-locked-fg)",
  },
};

export function StatusPill({ status, compact = false }: StatusPillProps) {
  const st = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: st.background,
        border: st.border,
        color: st.color,
        font: "var(--text-label-caps)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {st.label}
    </span>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (existing callers pass `"locked" | "pending" | "approved"`,
all still valid members of the widened union).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StatusPill.tsx
git commit -m "feat: add missed variant to StatusPill"
```

---

### Task 6: Admin UI — AchievementsTab "Denní" sub-tab

**Files:**
- Modify: `src/components/admin/AchievementsTab.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/achievements?daily=true` and the `isDaily`/`dailyDate` fields on every achievement row (Task 2). `POST`/`PATCH /api/admin/achievements` accepting `isDaily`/`dailyDate` (Task 2).

- [ ] **Step 1: Widen `subTab` and `AchievementRow`/`AchievementFormState` to cover the daily kind**

In `src/components/admin/AchievementsTab.tsx`, change:

```ts
interface AchievementRow {
  id: string;
  title: string;
  description: string;
  points: number;
  categoryId: string | null;
  categoryName: string | null;
  isSecret: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  iconPath: string | null;
  completedCount: number;
}
```

to:

```ts
interface AchievementRow {
  id: string;
  title: string;
  description: string;
  points: number;
  categoryId: string | null;
  categoryName: string | null;
  isSecret: boolean;
  isDaily: boolean;
  dailyDate: string | null;
  requiresApproval: boolean;
  isActive: boolean;
  iconPath: string | null;
  completedCount: number;
}
```

and change:

```ts
interface AchievementFormState {
  id?: string;
  title: string;
  description: string;
  points: string;
  categoryId: string;
  requiresApproval: boolean;
  isSecret: boolean;
}
```

to:

```ts
interface AchievementFormState {
  id?: string;
  title: string;
  description: string;
  points: string;
  categoryId: string;
  requiresApproval: boolean;
  isSecret: boolean;
  isDaily: boolean;
  dailyDate: string;
}
```

and change:

```ts
const EMPTY_FORM: AchievementFormState = {
  title: "",
  description: "",
  points: "10",
  categoryId: "",
  requiresApproval: true,
  isSecret: false,
};
```

to:

```ts
const EMPTY_FORM: AchievementFormState = {
  title: "",
  description: "",
  points: "10",
  categoryId: "",
  requiresApproval: true,
  isSecret: false,
  isDaily: false,
  dailyDate: "",
};
```

and change the `subTab` state declaration:

```ts
const [subTab, setSubTab] = useState<"normal" | "secret">("normal");
```

to:

```ts
const [subTab, setSubTab] = useState<"normal" | "secret" | "daily">("normal");
const [dailyAchievements, setDailyAchievements] = useState<AchievementRow[]>([]);
```

- [ ] **Step 2: Load daily achievements alongside normal/secret**

Change `loadAchievements`:

```ts
  function loadAchievements() {
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?secret=false")
      .then((r) => setNormalAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?secret=true")
      .then((r) => setSecretAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }
```

to:

```ts
  function loadAchievements() {
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?secret=false")
      .then((r) => setNormalAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?secret=true")
      .then((r) => setSecretAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
    apiFetch<{ achievements: AchievementRow[] }>("/api/admin/achievements?daily=true")
      .then((r) => setDailyAchievements(r.achievements))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }
```

- [ ] **Step 3: Update `openNew`/`openEdit` to carry the daily fields**

Change:

```ts
  function openNew(isSecret: boolean) {
    setForm({ ...EMPTY_FORM, isSecret, requiresApproval: !isSecret, categoryId: categories[0]?.id ?? "" });
    setNewCategoryInModal("");
    setCurrentIconPath(null);
    setIconFile(null);
    setIconPreview("");
    setIconError("");
    setError("");
  }

  function openEdit(a: AchievementRow) {
    setForm({
      id: a.id,
      title: a.title,
      description: a.description,
      points: String(a.points),
      categoryId: a.categoryId ?? "",
      requiresApproval: a.requiresApproval,
      isSecret: a.isSecret,
    });
    setNewCategoryInModal("");
    setCurrentIconPath(a.iconPath);
    setIconFile(null);
    setIconPreview("");
    setIconError("");
    setError("");
  }
```

to:

```ts
  function openNew(kind: "normal" | "secret" | "daily") {
    setForm({
      ...EMPTY_FORM,
      isSecret: kind === "secret",
      isDaily: kind === "daily",
      requiresApproval: kind !== "secret",
      categoryId: kind === "normal" ? categories[0]?.id ?? "" : "",
    });
    setNewCategoryInModal("");
    setCurrentIconPath(null);
    setIconFile(null);
    setIconPreview("");
    setIconError("");
    setError("");
  }

  function openEdit(a: AchievementRow) {
    setForm({
      id: a.id,
      title: a.title,
      description: a.description,
      points: String(a.points),
      categoryId: a.categoryId ?? "",
      requiresApproval: a.requiresApproval,
      isSecret: a.isSecret,
      isDaily: a.isDaily,
      dailyDate: a.dailyDate ?? "",
    });
    setNewCategoryInModal("");
    setCurrentIconPath(a.iconPath);
    setIconFile(null);
    setIconPreview("");
    setIconError("");
    setError("");
  }
```

- [ ] **Step 4: Validate and send `isDaily`/`dailyDate` in `saveForm`**

Change the start of `saveForm`:

```ts
  async function saveForm() {
    if (!form) return;
    setError("");
    try {
      let categoryId = form.categoryId;
      if (!form.isSecret && categoryId === NEW_CATEGORY_VALUE) {
```

to:

```ts
  async function saveForm() {
    if (!form) return;
    setError("");
    if (form.isDaily && !form.dailyDate) {
      setError("Vyber datum pro denní achievement.");
      return;
    }
    try {
      let categoryId = form.categoryId;
      if (!form.isSecret && !form.isDaily && categoryId === NEW_CATEGORY_VALUE) {
```

and change the payload construction:

```ts
      const payload = {
        title: form.title,
        description: form.description,
        points: Number(form.points),
        categoryId: form.isSecret ? null : categoryId,
        requiresApproval: form.requiresApproval,
        isSecret: form.isSecret,
      };
```

to:

```ts
      const payload = {
        title: form.title,
        description: form.description,
        points: Number(form.points),
        categoryId: form.isSecret || form.isDaily ? null : categoryId,
        requiresApproval: form.requiresApproval,
        isSecret: form.isSecret,
        isDaily: form.isDaily,
        dailyDate: form.isDaily ? form.dailyDate : undefined,
      };
```

- [ ] **Step 5: Add the third sub-tab button and update the "+ Přidat" button**

Change the sub-tab pill row:

```tsx
          <button
            onClick={() => setSubTab("secret")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              font: "var(--text-label)",
              background: subTab === "secret" ? "var(--surface-primary)" : "transparent",
              color: subTab === "secret" ? "var(--text-on-primary)" : "var(--text-muted)",
            }}
          >
            Pool tajných
          </button>
        </div>
        <Button variant="gold" size="md" onClick={() => openNew(subTab === "secret")}>
          {subTab === "secret" ? "+ Přidat tajný" : "+ Přidat achievement"}
        </Button>
      </div>
```

to:

```tsx
          <button
            onClick={() => setSubTab("secret")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              font: "var(--text-label)",
              background: subTab === "secret" ? "var(--surface-primary)" : "transparent",
              color: subTab === "secret" ? "var(--text-on-primary)" : "var(--text-muted)",
            }}
          >
            Pool tajných
          </button>
          <button
            onClick={() => setSubTab("daily")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              font: "var(--text-label)",
              background: subTab === "daily" ? "var(--surface-primary)" : "transparent",
              color: subTab === "daily" ? "var(--text-on-primary)" : "var(--text-muted)",
            }}
          >
            Denní
          </button>
        </div>
        <Button variant="gold" size="md" onClick={() => openNew(subTab)}>
          {subTab === "secret" ? "+ Přidat tajný" : subTab === "daily" ? "+ Přidat denní" : "+ Přidat achievement"}
        </Button>
      </div>
```

- [ ] **Step 6: Render the daily list**

The existing render is `{subTab === "normal" ? (<>...</>) : (<>...</>)}` — the
`subTab === "normal"` branch and its opening `<>` stay exactly as they are.
Change the outer conditional from a two-way to a three-way branch by turning
the `) : (` that currently separates normal from secret into a check for
`"secret"` specifically, then adding a new branch for `"daily"` where the
old catch-all `else` used to be. Change the `) : (` that currently separates
normal from secret:

```tsx
      ) : (
        <>
          <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
            Sada tajných achievementů, ze které se losuje po dosažení každé stovky bodů. Hráči obsah
            nevidí, dokud si ho nevylosují.
          </span>
```

to:

```tsx
      ) : subTab === "secret" ? (
        <>
          <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
            Sada tajných achievementů, ze které se losuje po dosažení každé stovky bodů. Hráči obsah
            nevidí, dokud si ho nevylosují.
          </span>
```

and change the closing of the secret branch, which is currently the last
`)` before `{form && (` — find:

```tsx
        </>
      )}

      {form && (
```

and replace with:

```tsx
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {dailyAchievements.map((a) => (
            <div
              key={a.id}
              onClick={() => openEdit(a)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                flexWrap: "wrap",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                opacity: a.isActive ? 1 : 0.55,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  flexShrink: 0,
                  background: "var(--surface-card-sunken)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={a.iconPath ?? PLACEHOLDER_ICON}
                  alt=""
                  style={{ width: a.iconPath ? "100%" : "55%", height: a.iconPath ? "100%" : "55%", objectFit: "cover", opacity: a.iconPath ? 1 : 0.5, borderRadius: a.iconPath ? "var(--radius-md)" : 0 }}
                />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 160, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>{a.title}</span>
                <span
                  style={{
                    font: "var(--text-body-sm)",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.description}
                </span>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--surface-card-sunken)",
                  border: "1px solid var(--border-subtle)",
                  font: "var(--text-label-caps)",
                  letterSpacing: "var(--tracking-caps)",
                  color: "var(--text-muted)",
                }}
              >
                {a.dailyDate ? new Date(`${a.dailyDate}T00:00:00`).toLocaleDateString("cs-CZ") : ""}
              </span>
              {!a.requiresApproval && (
                <span
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--status-approved-bg)",
                    border: "1px solid var(--status-approved-border)",
                    color: "var(--status-approved-fg)",
                    font: "var(--text-label-caps)",
                    letterSpacing: "var(--tracking-caps)",
                  }}
                >
                  auto-schváleno
                </span>
              )}
              <Badge points={a.points} size="sm" state="default" />
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 50 }}>
                <span style={{ font: "700 16px/1.1 var(--font-body)", color: "var(--text-heading)" }}>
                  {a.completedCount}
                </span>
                <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>splnilo</span>
              </div>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              >
                <Toggle size="sm" checked={a.isActive} onChange={() => toggleActive(a)} label="Aktivní/skryto" />
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                  Upravit
                </Button>
              </div>
            </div>
          ))}
          {dailyAchievements.length === 0 && (
            <span style={{ font: "var(--text-body-sm)", color: "var(--text-disabled)" }}>
              Zatím žádný denní achievement.
            </span>
          )}
        </div>
      )}

      {form && (
```

- [ ] **Step 7: Show a date field instead of the category field when `form.isDaily`**

Change:

```tsx
            {!form.isSecret && (
              <div style={{ flex: 2 }}>
                <ModalField label="Kategorie">
```

to:

```tsx
            {!form.isSecret && !form.isDaily && (
              <div style={{ flex: 2 }}>
                <ModalField label="Kategorie">
```

and immediately after the closing of that `ModalField`/`div` block (right
before the `{!form.isSecret && form.categoryId === NEW_CATEGORY_VALUE && (`
block), add:

```tsx
            {form.isDaily && (
              <div style={{ flex: 2 }}>
                <ModalField label="Datum">
                  <input
                    type="date"
                    className="cca-input"
                    value={form.dailyDate}
                    onChange={(e) => setForm({ ...form, dailyDate: e.target.value })}
                    style={{ minHeight: 40, padding: "10px 12px", boxShadow: "none" }}
                  />
                </ModalField>
              </div>
            )}
```

and change the new-category block's guard from:

```tsx
          {!form.isSecret && form.categoryId === NEW_CATEGORY_VALUE && (
```

to:

```tsx
          {!form.isSecret && !form.isDaily && form.categoryId === NEW_CATEGORY_VALUE && (
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 9: Manual check**

In the browser, log in as admin, go to Admin → Achievementy:
- Click "Denní" sub-tab → empty list initially.
- Click "+ Přidat denní" → modal shows Název/Popis/Body/Datum (no Kategorie field), "Automaticky schválit" checkbox, icon uploader.
- Create one for today → appears in the Denní list with the date pill.
- Try creating a second one for the same date → error "Pro tento den už existuje jiný denní achievement." shown in the modal.
- Edit the first one, change its date to tomorrow → saves successfully, pill updates.
- Confirm it does *not* appear under "Běžné achievementy".

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/AchievementsTab.tsx
git commit -m "feat: add Denní sub-tab to admin AchievementsTab"
```

---

### Task 7: Admin UI — PlayersTab manual-grant picker includes daily achievements

**Files:**
- Modify: `src/components/admin/PlayersTab.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/achievements?daily=true` (Task 2).

- [ ] **Step 1: Fetch and merge daily achievements into the grant picker's options**

Change `openAddModal`:

```ts
  async function openAddModal() {
    setPickedId("");
    setAddError("");
    setAddModalOpen(true);
    try {
      const [normal, secret] = await Promise.all([
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?secret=false"),
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?secret=true"),
      ]);
      const active = new Set(detail?.activeAchievementIds ?? []);
      setOptions([...normal.achievements, ...secret.achievements].filter((a) => !active.has(a.id)));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Chyba načítání.");
    }
  }
```

to:

```ts
  async function openAddModal() {
    setPickedId("");
    setAddError("");
    setAddModalOpen(true);
    try {
      const [normal, secret, daily] = await Promise.all([
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?secret=false"),
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?secret=true"),
        apiFetch<{ achievements: AchievementOption[] }>("/api/admin/achievements?daily=true"),
      ]);
      const active = new Set(detail?.activeAchievementIds ?? []);
      setOptions(
        [...normal.achievements, ...secret.achievements, ...daily.achievements].filter(
          (a) => !active.has(a.id),
        ),
      );
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Chyba načítání.");
    }
  }
```

`AchievementOption` (`{ id: string; title: string; points: number }`) already
matches the fields present on daily rows returned by
`GET /api/admin/achievements?daily=true`, so no type change is needed there.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

In the browser, Admin → Hráči, select a player, click "+ Přidat achievement":
confirm a daily achievement created in Task 6 appears in the dropdown.
Select it and save → confirm it now shows under "Splněné achievementy" for
that player, and that `GET /api/daily` for that player now reports it as
`"approved"` in history (per Task 4's endpoint).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/PlayersTab.tsx
git commit -m "feat: include daily achievements in admin manual-grant picker"
```

---

### Task 8: Player UI — Dashboard "Denní výzva" section

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/daily` (Task 4), reusing the existing `AchievementCard` component and `Status` type already defined in this file (no changes to `AchievementCard` itself).
- Produces: a link to `/daily-history`, the route Task 9 creates.

- [ ] **Step 1: Add the daily-today type and fetch**

Add near the top of `src/app/(app)/dashboard/page.tsx`, after the existing
`AchievementItem`/`AchievementsResponse` interfaces:

```ts
interface DailyToday {
  id: string;
  title: string;
  description: string;
  points: number;
  iconPath: string | null;
  status: Status;
}

interface DailyResponse {
  today: DailyToday | null;
}
```

Add a new state and effect inside `DashboardPage`, alongside the existing
`data`/`error` state:

```ts
  const [daily, setDaily] = useState<DailyResponse | null>(null);

  useEffect(() => {
    apiFetch<DailyResponse>("/api/daily")
      .then(setDaily)
      .catch(() => {});
  }, []);
```

(Daily-load failure is swallowed rather than surfaced via the page's `error`
banner — a missing daily section is not a page-breaking error, unlike a
failed `/api/achievements` load.)

- [ ] **Step 2: Render the section above the category groups**

Change:

```tsx
            {Array.from(groups.entries()).map(([categoryName, items]) => (
```

to insert the new section right before it:

```tsx
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "var(--space-2) 0" }}>
                <span
                  style={{
                    font: "var(--text-label-caps)",
                    letterSpacing: "var(--tracking-caps)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Denní výzva
                </span>
                <button
                  onClick={() => router.push("/daily-history")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    font: "var(--text-body-sm)",
                    color: "var(--text-muted)",
                    textDecoration: "underline",
                  }}
                >
                  Zobrazit historii →
                </button>
              </div>
              {daily?.today ? (
                <AchievementCard
                  item={{ ...daily.today, categoryName: "" }}
                  onClick={() => router.push(`/achievement/${daily.today!.id}`)}
                />
              ) : (
                <div
                  style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px dashed var(--border-default)",
                    color: "var(--text-disabled)",
                    font: "var(--text-body-sm)",
                  }}
                >
                  Dnes žádná denní výzva.
                </div>
              )}
            </div>

            {Array.from(groups.entries()).map(([categoryName, items]) => (
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (`AchievementCard`'s `item` prop is typed as
`AchievementItem`, which includes `categoryName: string` — passing
`categoryName: ""` satisfies that without modifying `AchievementCard`.)

- [ ] **Step 4: Manual check**

In the browser as a player: with a daily achievement scheduled for today
(create one as admin per Task 6), reload the Dashboard → confirm the "Denní
výzva" card appears above the category lists, matching the normal
achievement card styling, and tapping it opens `/achievement/<id>`. Then
deactivate or delete it as admin and reload → confirm the "Dnes žádná denní
výzva." placeholder shows instead. Confirm "Zobrazit historii →" is always
visible regardless.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: show today's daily achievement on the dashboard"
```

---

### Task 9: Player UI — new /daily-history page

**Files:**
- Create: `src/app/(app)/daily-history/page.tsx`

**Interfaces:**
- Consumes: `GET /api/daily`'s `history` array (Task 4), `StatusPill`'s `"missed"` variant (Task 5).

- [ ] **Step 1: Write the page**

Create `src/app/(app)/daily-history/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, StatusPill } from "@/components/ui";
import { apiFetch } from "@/lib/apiClient";

type HistoryStatus = "approved" | "pending" | "missed";

interface HistoryItem {
  id: string;
  title: string;
  dailyDate: string;
  points: number;
  iconPath: string | null;
  status: HistoryStatus;
}

interface DailyResponse {
  history: HistoryItem[];
}

function formatDailyDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export default function DailyHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DailyResponse>("/api/daily")
      .then((r) => setHistory(r.history))
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba načítání."));
  }, []);

  return (
    <AppShell title="Historie denních výzev" activeTab="dashboard">
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {error && <span style={{ color: "var(--status-pending-fg)" }}>{error}</span>}
        {history?.length === 0 && (
          <span style={{ font: "var(--text-body-sm)", color: "var(--text-disabled)" }}>
            Zatím žádná denní výzva neproběhla.
          </span>
        )}
        {history?.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(`/achievement/${item.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>{item.title}</span>
              <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
                {formatDailyDate(item.dailyDate)}
              </span>
            </div>
            <Badge points={item.points} size="sm" state={item.status === "approved" ? "approved" : "default"} />
            <StatusPill status={item.status === "pending" ? "pending" : item.status} compact />
          </button>
        ))}
      </div>
    </AppShell>
  );
}
```

(`item.status === "pending" ? "pending" : item.status` — when not
`"pending"`, `item.status` is `"approved" | "missed"`, both valid
`StatusPill` values directly.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

In the browser as a player, navigate to `/daily-history` (via the Dashboard's
"Zobrazit historii →" link): confirm past daily achievements list with
correct date, points, and status pill (approved/pending/missed), and that
tapping one opens its `/achievement/[id]` detail page.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/daily-history/page.tsx"
git commit -m "feat: add daily achievement history page"
```

---

### Task 10: Player UI — detail page "missed" branch

**Files:**
- Modify: `src/app/(app)/achievement/[id]/page.tsx`

**Interfaces:**
- Consumes: `status: "missed"` from `GET /api/achievements/[id]` (Task 3), `StatusPill`'s `"missed"` variant (Task 5).

- [ ] **Step 1: Widen the `Status` type**

Change:

```ts
type Status = "undone" | "pending" | "approved";
```

to:

```ts
type Status = "undone" | "pending" | "approved" | "missed";
```

- [ ] **Step 2: Update the `StatusPill` mapping near the top of the detail card**

Change:

```tsx
                <StatusPill
                  status={data.status === "approved" ? "approved" : data.status === "pending" ? "pending" : "locked"}
                />
```

to:

```tsx
                <StatusPill
                  status={
                    data.status === "approved"
                      ? "approved"
                      : data.status === "pending"
                        ? "pending"
                        : data.status === "missed"
                          ? "missed"
                          : "locked"
                  }
                />
```

- [ ] **Step 3: Add the missed-state panel**

Immediately after the closing of the existing
`{data.status === "undone" && ( ... )}` block (the submit-form panel) and
before `{data.status === "pending" && ( ... )}`, add:

```tsx
                {data.status === "missed" && (
                  <div
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-lg)",
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}
                  >
                    <span style={{ font: "var(--text-heading-sm)", color: "var(--text-muted)" }}>
                      Tuhle výzvu jsi nestihl/a
                    </span>
                    <span style={{ font: "var(--text-body-sm)", color: "var(--text-disabled)" }}>
                      Denní výzva platila jen ve svůj den a ten už uplynul.
                    </span>
                  </div>
                )}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Using the past, un-submitted daily achievement from Task 3's manual check
(or create a fresh one with yesterday's `dailyDate`), open its
`/achievement/[id]` page as a player who never submitted it: confirm the
"Tuhle výzvu jsi nestihl/a" panel shows, the status pill reads "Zmeškáno",
and there is no submit form, no cancel button, no "Zrušit splnění" button.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/achievement/[id]/page.tsx"
git commit -m "feat: show missed state on achievement detail page"
```

---

## End-to-end verification (after all tasks)

Run through the spec's full testing checklist in one pass:

1. Create a daily achievement for today (Admin → Denní) → appears on
   Dashboard's Denní section, absent from regular category lists.
2. Complete it as a player → dashboard status updates, points total
   increases by its point value.
3. Attempt a second daily achievement for the same date → duplicate-date
   error shown in the admin modal.
4. Let a different daily achievement's date be yesterday with no
   submission → shows "Zmeškáno" in `/daily-history` and on its detail page.
5. Manually grant that missed one to a player via Admin → Hráči → confirm it
   now shows completed in that player's history.
6. Schedule a daily achievement for a future date → confirm it's invisible
   on the dashboard, in `/daily-history`, and via a direct `/achievement/[id]`
   URL, until the date arrives.
