# Daily achievements — design

## Purpose

Add a new kind of achievement tied to a specific calendar day. Admins schedule at
most one daily achievement per day; players can only complete it while that day
is current. Not every day needs one — it's optional. Players should see today's
live daily on the dashboard, and be able to look back at past days (completed or
missed) via a history page.

## Scope

- New achievement kind, alongside existing normal (category-based) and secret
  (draw-pool) achievements. Reuses the existing `Achievement` and `Submission`
  models — no new tables.
- Player completion is only possible on the scheduled day itself. Admins can
  still grant a missed daily to a player after the fact via the existing
  player-detail manual-grant feature.
- Future-scheduled daily achievements are hidden from players entirely until
  their day arrives (same "no peeking" spirit as secret achievements).

## Data model

Add two columns to `Achievement`:

```prisma
model Achievement {
  ...
  isDaily   Boolean @default(false)
  dailyDate String? @unique // "YYYY-MM-DD", set only when isDaily = true
  ...
}
```

- `isDaily` mirrors how `isSecret` already distinguishes achievement kinds.
  `isDaily` and `isSecret` are mutually exclusive.
- `categoryId` is always `null` for daily achievements (same as secret ones) —
  the "Denní" grouping shown to players is implicit from `isDaily`, not a real
  `Category` row.
- `dailyDate` carries a DB-level unique constraint, enforcing "at most one daily
  achievement per calendar day". SQLite treats multiple `NULL`s in a unique
  column as distinct, so normal/secret rows (`dailyDate = null`) are unaffected.
- Migration backfills `isDaily = false`, `dailyDate = null` for all existing
  rows — a no-op visually.
- No changes to `Submission`. A daily completion is a normal submission row
  (`source: "player"` or `"admin_manual"`), reusing pending/approved/rejected
  exactly as today. Points totals already work correctly since
  `getApprovedTotal` sums all approved submissions regardless of achievement
  kind.

## Date handling

"Today" is computed server-side in the `Europe/Prague` timezone (a small helper,
e.g. `todayDateString()` in `src/lib/`), so the day boundary is stable
regardless of the server's own timezone configuration.

## API changes

- `GET /api/admin/achievements?secret=false` — filter becomes
  `{ isSecret: false, isDaily: false }`, so daily achievements no longer leak
  into the "Běžné achievementy" admin list.
- `GET /api/admin/achievements?daily=true` (new) — filters `{ isDaily: true }`,
  ordered by `dailyDate asc`. Same response shape as the existing endpoint,
  plus a `dailyDate` field.
- `POST /api/admin/achievements` / `PATCH /api/admin/achievements/[id]` — accept
  `isDaily` and `dailyDate`.
  - When `isDaily` is true: `categoryId` is forced to `null`; `dailyDate` is
    required and validated as `YYYY-MM-DD`.
  - A `dailyDate` collision (unique constraint violation, Prisma error code
    `P2002`) is caught and turned into a 400 with message "Pro tento den už
    existuje jiný denní achievement."
  - Missing/invalid `dailyDate` when `isDaily` is true → 400 "Vyber datum pro
    denní achievement."
- `GET /api/achievements` (dashboard feed) — filter gains `isDaily: false`, so
  daily achievements never appear as a regular category card.
- `GET /api/achievements/[id]` (detail page; already generic) —
  - If the achievement `isDaily` and `dailyDate` is in the future → 404 (stays
    hidden until its day, consistent with URL-guessing being blocked the same
    way as a nonexistent id).
  - If `isDaily`, `dailyDate` is in the past, and there is no submission for
    the player → response `status` becomes a new value, `"missed"` (alongside
    the existing `undone | pending | approved`).
  - `categoryName` reports `"Denní výzva"` instead of `"Ostatní"` for daily
    rows.
- `POST /api/achievements/[id]/submit` (existing endpoint, reused as-is) —
  gains a check: submitting a daily achievement is only allowed when
  `dailyDate === today`; otherwise 400 "Tento den už uplynul." This is the only
  place the "only on its day" rule is enforced.
  - Admins bypass this entirely via the existing
    `POST /api/admin/players/[id]/achievements` manual-grant endpoint, which
    already works for any achievement id — no server change needed there.
- `GET /api/daily` (new) — powers the dashboard section and history page:
  ```
  {
    today: {
      id, title, description, points, iconPath, requiresApproval,
      status: "undone" | "pending" | "approved"
    } | null,
    history: {
      id, title, dailyDate, points, iconPath,
      status: "approved" | "pending" | "missed"
    }[]
  }
  ```
  `today` is present only when an active daily achievement is scheduled for
  today. `history` covers all past active daily achievements, most recent
  first.

## Admin UI

`AchievementsTab` gets a third sub-tab, "Denní", alongside the existing
"Běžné achievementy" / "Pool tajných":

- List view: same row layout as normal/secret achievements (icon, title,
  description, points, completed count, "auto-schváleno" pill when
  `requiresApproval` is false), plus the scheduled date shown as a small pill.
  Ordered chronologically by `dailyDate`.
- "+ Přidat denní" opens the existing create/edit modal, but with an
  `<input type="date">` bound to `dailyDate` in place of the category
  `<select>` — daily achievements never show a category field, same as secret
  ones today.
- Editing an existing daily achievement allows changing its date, subject to
  the same uniqueness check (a duplicate date is rejected with the message
  above).
- `PlayersTab`'s manual-grant picker (`+ Přidat achievement`) currently merges
  `secret=false` and `secret=true` fetches into its option list; it will also
  fetch `daily=true` and merge those in, so admins can retroactively grant a
  missed daily achievement to a player.

## Player UI

**Dashboard** (`/dashboard`): a new "Denní výzva" section, pinned above the
category groups, below the points-summary card.

- If `today` is present (from `GET /api/daily`): a card styled like the
  existing `AchievementCard` (icon, title, description, points, status pill),
  tappable → `/achievement/[id]`. This reuses the existing detail page and its
  submit/cancel flow unchanged; no new submission UI is built.
- If `today` is absent: a small muted placeholder row, "Dnes žádná denní
  výzva."
- Either way, a "Zobrazit historii →" link is always shown, opening the new
  history page.

**New page**, `/daily-history`: lists all past daily achievements from
`GET /api/daily`'s `history` array. Each row shows date, title, points, and a
status pill (`Splněno` / `Čeká na schválení` / `Zmeškáno`). Tapping a row opens
`/achievement/[id]`.

**Detail page** (`/achievement/[id]`): gains a fourth status branch,
`"missed"` — a muted info panel ("Tuhle výzvu jsi nestihl/a.") with no submit
form, alongside the existing `undone` / `pending` / `approved` branches.

## Error handling

- Duplicate `dailyDate` on create/edit → 400, "Pro tento den už existuje jiný
  denní achievement."
- Missing/invalid `dailyDate` when `isDaily` is true → 400, "Vyber datum pro
  denní achievement."
- Submitting a daily achievement outside its scheduled day → 400, "Tento den
  už uplynul."
- Requesting the detail of a future-dated daily achievement → 404, same as any
  nonexistent achievement id (no distinct error message, to avoid confirming
  that an id exists).

## Testing

No automated test suite exists in this repo (consistent with prior features);
verification is manual in the browser:

- Create a daily achievement for today; confirm it appears in the dashboard's
  Denní section and does *not* appear in any regular category list.
- Complete it as a player; confirm status updates and points total correctly.
- Attempt to schedule a second daily achievement for the same date; confirm
  the friendly duplicate-date error.
- Let a day pass without completing its daily; confirm it shows as "Zmeškáno"
  in `/daily-history` and its detail page.
- Manually grant a missed daily to a player via `PlayersTab`; confirm it then
  shows as completed in history.
- Schedule a daily achievement for a future date; confirm it is not visible
  anywhere to a player (dashboard, history, or direct detail URL) until its
  day arrives.
