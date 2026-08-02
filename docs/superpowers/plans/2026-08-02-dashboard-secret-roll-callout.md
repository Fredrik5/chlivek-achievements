# Dashboard Secret Roll Callout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a "you have N secret achievements to roll" callout with a CTA button in the dashboard's points card, and remove the now-redundant bottom teaser card.

**Architecture:** `GET /api/secret` gains an `availableCount` field (count of slots in `"available"` state). The dashboard page adds a third independent fetch (`/api/secret`, mirroring its existing `/api/daily` fetch) and renders a conditional callout below the existing progress bar inside the "Moje body" card when `availableCount > 0`. The dashed `SecretTeaserCard` block at the bottom of the dashboard is deleted.

**Tech Stack:** Next.js App Router (custom fork — see `AGENTS.md`), TypeScript, Prisma, client components with `useEffect`/`useState` + a shared `apiFetch` helper (no React Query/SWR), inline `style={{ }}` objects using CSS custom-property design tokens (no Tailwind).

## Global Constraints

- All UI copy is Czech, matching existing strings in `src/app/(app)/dashboard/page.tsx` and `src/app/(app)/secret/page.tsx`.
- No new shared/extracted component between the dashboard callout and the secret page's callout — copy the violet-glow styling as a local constant in `dashboard/page.tsx` (per spec, "Out of scope").
- No changes to `src/app/(app)/secret/page.tsx` or `src/app/api/secret/draw/route.ts`.
- This repo has zero test infrastructure (no runner, no config, no existing test files). Do not introduce one. Verify manually via the dev server instead of writing automated tests.
- Follow existing dashboard conventions exactly: inline `style` objects, CSS variable tokens (`var(--space-4)`, `var(--radius-lg)`, etc.), `router.push(...)` for navigation (no `next/link`).

---

### Task 1: Add `availableCount` to `GET /api/secret`

**Files:**
- Modify: `src/app/api/secret/route.ts:43-48`

**Interfaces:**
- Consumes: existing local `slots` array (each item has `state: "revealed" | "available" | "locked"`), already computed above this block.
- Produces: response JSON now includes `availableCount: number` alongside the existing `points`, `nextThreshold`, `hasAvailableNow`, `slots` fields. Task 2 consumes this field by name.

- [ ] **Step 1: Add the `availableCount` field to the response**

In `src/app/api/secret/route.ts`, the `GET` handler currently ends with:

```ts
    return NextResponse.json({
      points: total,
      nextThreshold: upcoming,
      hasAvailableNow: slots.some((s) => s.state === "available"),
      slots,
    });
```

Change it to:

```ts
    return NextResponse.json({
      points: total,
      nextThreshold: upcoming,
      hasAvailableNow: slots.some((s) => s.state === "available"),
      availableCount: slots.filter((s) => s.state === "available").length,
      slots,
    });
```

- [ ] **Step 2: Manually verify the response shape**

Run: `npm run dev`

With the dev server running and logged in as a user who has crossed at least one
100-point milestone without drawing (or use an existing test account), open
`http://localhost:3000/api/secret` directly in the browser (or `curl` with the
session cookie) and confirm the JSON body now includes an `availableCount` field
whose value matches the number of `"available"` entries in `slots`.

If no such user exists locally, this can be verified together with Task 2's
manual check instead (the dashboard callout rendering IS the verification that
this field is present and correct) — don't block on this step in isolation if
setting up a milestone-crossed test user is awkward locally.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/secret/route.ts
git commit -m "feat: expose availableCount on GET /api/secret"
```

---

### Task 2: Dashboard callout — fetch summary and render it

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/secret` response `{ points, nextThreshold, hasAvailableNow, availableCount, slots }` from Task 1 — only `hasAvailableNow`/`availableCount` are used here, via a narrower local `SecretSummary` type.
- Produces: nothing consumed by later tasks (Task 3 in this same file just removes unrelated code).

- [ ] **Step 1: Add the `SecretSummary` type and state**

In `src/app/(app)/dashboard/page.tsx`, add this interface near the existing
`DailyResponse` interface (after line 38):

```ts
interface SecretSummary {
  hasAvailableNow: boolean;
  availableCount: number;
}
```

In the `DashboardPage` component, add state alongside the existing `daily` state
(after line 50, `const [daily, setDaily] = useState<DailyResponse | null>(null);`):

```ts
  const [secret, setSecret] = useState<SecretSummary | null>(null);
```

- [ ] **Step 2: Fetch `/api/secret` on mount**

Add a third `useEffect`, alongside the existing two (after the `daily` fetch
effect that ends at line 62):

```ts
  useEffect(() => {
    apiFetch<SecretSummary>("/api/secret")
      .then(setSecret)
      .catch(() => {});
  }, []);
```

This mirrors the existing `/api/daily` fetch exactly (silent catch — a failed
fetch just means the callout doesn't render).

- [ ] **Step 3: Import `Button` and add the violet-glow styling constants**

Update the existing UI import (line 6) from:

```ts
import { Badge, CategoryHeader, ProgressBar, StatusPill } from "@/components/ui";
```

to:

```ts
import { Badge, Button, CategoryHeader, ProgressBar, StatusPill } from "@/components/ui";
```

Add these two constants near the top of the file, after the imports (after
line 7, before `type Status = ...`):

```ts
const VIOLET_BORDER = "rgba(147,72,178,0.4)";
const VIOLET_WASH = "rgba(107,38,130,0.16)";
```

(These are copied verbatim from `src/app/(app)/secret/page.tsx:31-32` — only the
two constants used by the callout box, not `VIOLET_GLOW`, which that page uses
elsewhere for slot cards and isn't needed here.)

- [ ] **Step 4: Render the callout inside the "Moje body" card**

In the points card JSX, immediately after the `<ProgressBar ... />` element
(currently lines 115-120, the last child before the card's closing `</div>` on
line 121), add:

```tsx
              {secret && secret.availableCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: `linear-gradient(160deg, ${VIOLET_WASH}, var(--surface-card-sunken))`,
                    border: `1px solid ${VIOLET_BORDER}`,
                    boxShadow: "0 0 0 1px rgba(200,148,43,0.5), 0 0 18px rgba(147,72,178,0.3)",
                  }}
                >
                  <span style={{ font: "var(--text-body-sm)", color: "var(--text-heading)" }}>
                    {secret.availableCount === 1
                      ? "Máš k dispozici 1 losování tajného achievementu."
                      : `Máš k dispozici ${secret.availableCount} losování tajných achievementů.`}
                  </span>
                  <Button variant="gold" size="md" fullWidth onClick={() => router.push("/secret")}>
                    Vylosovat →
                  </Button>
                </div>
              )}
```

So the full card (lines 89-121 originally) now ends with this block instead of
closing right after `ProgressBar`.

- [ ] **Step 5: Manually verify**

Run: `npm run dev`, log in as a user, and check the dashboard at
`http://localhost:3000/dashboard`:

- **0 available rolls** (user hasn't crossed a 100-point milestone, or has drawn
  everything crossed so far): the points card shows only the points number and
  progress bar, exactly as before — no callout.
- **1 available roll**: callout appears below the progress bar reading "Máš k
  dispozici 1 losování tajného achievementu." with a gold "Vylosovat →" button.
- **2+ available rolls**: callout reads "Máš k dispozici {n} losování tajných
  achievementů." with the same button.
- Clicking "Vylosovat →" navigates to `/secret`.
- On `/secret`, drawing the achievement(s) down to 0 available and returning to
  `/dashboard` makes the callout disappear again (confirms the fetch/state isn't
  stale — reloading the dashboard page re-fetches `/api/secret`).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: show secret achievement roll callout on dashboard"
```

---

### Task 3: Remove the bottom "Legendary" teaser card

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Delete the `Legendary` category block from the JSX**

Remove this block (originally lines 184-187, immediately before the closing
`</>` / `</div>` of the data-loaded section):

```tsx
            <div>
              <CategoryHeader title="Legendary" count={1} />
              <SecretTeaserCard onClick={() => router.push("/secret")} />
            </div>
```

- [ ] **Step 2: Delete the now-unused `SecretTeaserCard` function**

Remove the entire `SecretTeaserCard` function definition (originally lines
272-315, the last function in the file):

```tsx
function SecretTeaserCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-card)",
        border: "1px dashed var(--border-default)",
        opacity: 0.85,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-md)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-card-sunken)",
          border: "1px dashed var(--border-default)",
        }}
      >
        <span style={{ font: "400 22px/1 var(--font-display)", color: "var(--text-muted)" }}>?</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ font: "var(--text-heading-sm)", color: "var(--text-heading)" }}>
          ??? Tajný achievement
        </span>
        <span style={{ font: "var(--text-body-sm)", color: "var(--text-muted)" }}>
          Odhalí se, až dosáhneš další stovky bodů. Klepnutím zobrazíš detail losování.
        </span>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Check for now-unused imports**

`CategoryHeader` is still used elsewhere in the file (for each achievement
category group, e.g. `<CategoryHeader title={categoryName} count={items.length} />`),
so the import stays. Confirm this by checking the remaining usages in the file
after deletion — do not remove `CategoryHeader` from the import list.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no new errors (in particular, no "unused variable" warnings for
`SecretTeaserCard` or `CategoryHeader`).

- [ ] **Step 5: Manually verify**

With `npm run dev` running, load `/dashboard` and confirm the dashed "???
Tajný achievement" card and "Legendary" section header no longer appear
anywhere on the page, regardless of whether the new callout from Task 2 is
showing.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "chore: remove redundant secret achievement teaser card from dashboard"
```
