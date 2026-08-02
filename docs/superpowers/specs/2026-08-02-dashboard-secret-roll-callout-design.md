# Dashboard: secret achievement roll-available callout

## Problem

The dashboard's "Moje body" card shows total points and a progress bar toward the
next 100-point milestone ("Do další stovky ... ještě 85 b. a odemkneš tajný
achievement"). It never tells the user when they've *already* crossed a milestone
and have a secret achievement ready to roll right now — that state only becomes
visible after navigating to `/secret`. Separately, a dashed "??? Tajný achievement"
teaser card at the bottom of the dashboard always links to `/secret` regardless of
whether anything is actually available there.

## Goal

Surface roll-availability directly on the dashboard: how many secret achievements
the user can currently roll, and a button that takes them to `/secret` to do it.
Keep the existing points/progress-bar timeline unchanged. Remove the now-redundant
bottom teaser card.

## Design

### 1. API: expose an available-roll count

`GET /api/secret` (`src/app/api/secret/route.ts`) already computes `slots` (one
entry per 100-point threshold reached or upcoming, each `locked` / `available` /
`revealed`) and derives `hasAvailableNow: slots.some(s => s.state === "available")`.

Add `availableCount: number` to the same response, computed as
`slots.filter(s => s.state === "available").length`. No other change to this route.

Resulting response shape:

```ts
interface SecretResponse {
  points: number;
  nextThreshold: number;
  hasAvailableNow: boolean;
  availableCount: number; // new
  slots: Slot[];
}
```

### 2. Dashboard: fetch the summary

`src/app/(app)/dashboard/page.tsx` already runs two independent fetches on mount
(`/api/achievements`, `/api/daily`). Add a third, following the same pattern:

```ts
interface SecretSummary {
  hasAvailableNow: boolean;
  availableCount: number;
}

const [secret, setSecret] = useState<SecretSummary | null>(null);

useEffect(() => {
  apiFetch<SecretSummary>("/api/secret")
    .then(setSecret)
    .catch(() => {});
}, []);
```

Errors are swallowed (matching the `/api/daily` fetch) — a failed fetch just means
the callout doesn't render, it doesn't block the rest of the dashboard.

### 3. Dashboard: roll-available callout in the "Moje body" card

Inside the existing points card, directly below the `ProgressBar` (which stays as
today — same value/max/label/sublabel), conditionally render a callout when
`secret?.availableCount` is greater than 0:

- Reuses the secret page's violet-glow visual treatment (`VIOLET_WASH` /
  `VIOLET_BORDER` background gradient + border + glow box-shadow), copied as a
  local styling constant in `dashboard/page.tsx` — not extracted into a shared
  component, since the dashboard version also needs an embedded button and the
  secret page's version doesn't.
- Copy: Czech pluralization based on count —
  - `n === 1`: "Máš k dispozici 1 losování tajného achievementu."
  - `n > 1`: "Máš k dispozici {n} losování tajných achievementů."
- Below the copy, a `Button` (`variant="gold"`, `size="md"`, `fullWidth`) labeled
  **"Vylosovat →"**, `onClick={() => router.push("/secret")}`.
- When `availableCount` is `0` or the fetch hasn't resolved yet, nothing extra
  renders — the existing progress bar/sublabel is the only signal, unchanged from
  today.

### 4. Dashboard: remove the bottom teaser

Delete the `Legendary` `CategoryHeader` + `SecretTeaserCard` block currently
rendered after the achievement category groups, and delete the now-unused
`SecretTeaserCard` function entirely. The new callout in the points card already
covers discovery of `/secret`, and unlike the old teaser (which always linked
there regardless of state), it only appears when there's something to actually do.

## Out of scope

- No changes to the secret page (`src/app/(app)/secret/page.tsx`) itself.
- No changes to `/api/secret/draw` or draw logic.
- No shared/extracted component between the dashboard callout and the secret
  page's callout — they're visually similar but structurally different (button
  vs. none), and there are only two call sites.

## Files touched

- `src/app/api/secret/route.ts` — add `availableCount` to the GET response.
- `src/app/(app)/dashboard/page.tsx` — fetch `/api/secret` summary, render the
  callout in the points card, remove the `Legendary`/`SecretTeaserCard` block and
  the now-dead `SecretTeaserCard` function.
