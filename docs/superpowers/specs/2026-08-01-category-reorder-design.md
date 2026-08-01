# Admin category reordering — design

## Purpose

Admins currently have no way to control the order categories appear in — in the
admin "Kategorie" panel or on the player dashboard. Order is implicit: whatever
order categories were created in (`createdAt asc`). This feature lets an admin
move categories up/down, and that order drives both the admin panel and the
player-facing dashboard grouping.

This mirrors the achievement-reorder feature
([2026-08-01-achievement-reorder-design.md](2026-08-01-achievement-reorder-design.md)),
one level up: categories instead of achievements-within-a-category.

## Scope

- Applies to all categories. Categories are a flat, non-nested list, so there's
  no per-parent grouping to worry about (unlike achievement order, which is
  scoped within a category).
- Does not touch achievement ordering within a category — that's unchanged.
- Uncategorized achievements (`categoryId = null`, shown under "Ostatní") are
  unaffected — their position relative to real categories in the sort keeps
  today's existing (incidental) behavior.

## Data model

Add an `order` column to `Category`:

```prisma
model Category {
  id        String   @id @default(cuid())
  name      String   @unique
  order     Int      @default(0)
  createdAt DateTime @default(now())
  achievements Achievement[]
}
```

Migration backfills existing rows: categories are numbered 0, 1, 2, … in their
current `createdAt asc` order — so the migration is a no-op visually (today's
implicit order becomes the new explicit order).

## Order assignment rules

- **New category** (`POST /api/admin/categories`): `order` = `(max order among
  existing categories) + 1`. If there are no categories yet, `order = 0`.

## API changes

- `GET /api/admin/categories` — order by `order asc` instead of `createdAt
  asc`.
- New endpoint: `POST /api/admin/categories/[id]/reorder`
  - Body: `{ "direction": "up" | "down" }`
  - Server loads the category, then all categories ordered by `[order asc,
    createdAt asc]` (createdAt as a tiebreaker for equal `order` values —
    categories aren't nested, so siblings = the full list, no filter needed),
    locates the target's neighbor in the requested direction, and swaps the
    two categories' `order` values via `prisma.$transaction`.
  - No-op (200, unchanged) if there is no neighbor in that direction (already
    first/last).
  - Requires admin auth (`requireAdmin()`), same as other
    `/api/admin/categories/*` routes.
- `GET /api/achievements` (player dashboard feed) and `GET
  /api/admin/achievements?secret=false` (admin non-secret list) — change
  `orderBy` from `[{ categoryId: "asc" }, { order: "asc" }]` to `[{ category:
  { order: "asc" } }, { order: "asc" }]`, so the admin's category ordering is
  what drives dashboard grouping order for players. The secret-achievement
  listing (`?secret=true`, still ordered by `createdAt`) is untouched — secret
  achievements aren't grouped by category on screen.

## UI changes

`AchievementsTab.tsx`, "Kategorie" management panel:

- Each category chip gets the same stacked ▲/▼ button pair used for
  achievement rows (22×18px buttons, disabled + dimmed at the boundary),
  placed before the rename (✎) and delete (✕) buttons.
- Chips are already rendered in `categories` array order (which will now be
  `order asc`), so up/down-disabled is a plain index check against the array
  — no contiguity logic needed (unlike the achievement case, which has to
  check category membership of neighbors).
- Clicking a button calls the reorder endpoint, then `loadCategories()`.

## Error handling

- Reorder endpoint: if the category doesn't exist → 404 (via `handleApiError`,
  consistent with other admin category routes). Invalid `direction` (not
  `"up"`/`"down"`) → 400.

## Testing

- Manual verification in the browser: reorder categories in the admin panel,
  confirm the player dashboard reflects the new grouping order, confirm
  boundary buttons disable correctly on the first/last chip, confirm creating
  a new category appends it to the end of the list.
- No automated test suite exists in this repo currently; none added
  specifically for this feature, consistent with existing conventions.
