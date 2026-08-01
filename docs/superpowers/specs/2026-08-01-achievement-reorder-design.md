# Admin achievement reordering — design

## Purpose

Admins currently have no way to control the order achievements appear in within a
category (both in the admin Achievements tab and on the player dashboard). Order
is implicit: whatever order rows were created in (`createdAt asc`). This feature
lets an admin move achievements up/down within their category.

## Scope

- Applies only to normal (non-secret) achievements, ordered **within their category**.
- Secret achievements (the hidden draw pool) are unaffected — they keep sorting by
  `createdAt`, since their order has no effect on players (drawn randomly) and the
  admin explicitly said they should stay ordered by when they were added to the pool.

## Data model

Add an `order` column to `Achievement`:

```prisma
model Achievement {
  ...
  order Int @default(0)
  ...
}
```

Migration backfills existing rows: for each category, achievements are numbered
0, 1, 2, … in their current `createdAt asc` order — so the migration is a no-op
visually (today's implicit order becomes the new explicit order).

Secret achievements (`categoryId = null`) also get `order` written by the
migration (numbered by `createdAt` among themselves) but the column is unused
for them; their listing keeps sorting by `createdAt`.

## Order assignment rules

- **New achievement**: `order` = `(max order among achievements in the same
  category) + 1`. If the category has no achievements yet, `order = 0`.
- **Achievement moved to a different category** (via edit form): `order` is
  recomputed the same way — appended to the end of the new category's list.
  (If the category is unchanged, `order` is left as-is even if other fields
  are edited.)

## API changes

- `GET /api/admin/achievements?secret=false` — order by `[categoryId, order]`
  instead of `createdAt`.
- `GET /api/admin/achievements?secret=true` — unchanged, still `createdAt asc`.
- `GET /api/achievements` (player dashboard feed) — order by `[categoryId,
  order]` instead of `createdAt`, so the admin's ordering is what players
  actually see.
- New endpoint: `POST /api/admin/achievements/[id]/reorder`
  - Body: `{ "direction": "up" | "down" }`
  - Server loads the achievement, finds all achievements in the same category
    ordered by `[order, createdAt]` (createdAt as a tiebreaker for equal
    `order` values), locates the target's neighbor in the requested direction,
    and swaps the two achievements' `order` values.
  - No-op (200, unchanged) if there is no neighbor in that direction (already
    first/last).
  - Requires admin auth, same as other `/api/admin/achievements/*` routes.

## UI changes

`AchievementsTab` (normal achievements list only):

- Each row gets two small up/down arrow buttons alongside the existing
  Toggle/"Upravit" controls.
- Because the list is always sorted by `(categoryId, order)`, achievements in
  the same category are always contiguous in the array — this holds
  regardless of whether the admin has the "Vše" (all) filter or a single
  category chip selected. So the buttons work the same way in both views with
  no special-casing.
- Up is disabled for the first item in its category group; down is disabled
  for the last.
- Clicking a button calls the reorder endpoint, then reloads achievements
  (same pattern as `toggleActive`).
- Secret-pool tab (`subTab === "secret"`) is untouched — no reorder buttons
  there.

## Error handling

- Reorder endpoint: if the achievement doesn't exist → 404 (consistent with
  other admin achievement routes' implicit Prisma error handling via
  `handleApiError`). If it's a secret achievement, the endpoint still works
  mechanically (swaps order among other secret achievements) but the UI never
  calls it for secret rows, so this path is unreachable in practice.

## Testing

- Manual verification in the browser: reorder achievements within a category,
  confirm dashboard reflects new order, confirm boundary buttons disable
  correctly, confirm creating a new achievement appends to the end of its
  category, confirm switching an achievement's category appends it to the new
  category's end.
- No automated test suite exists in this repo currently; none added
  specifically for this feature, consistent with existing conventions.
