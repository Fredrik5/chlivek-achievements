# Admin: change a player's password

## Problem

Players sometimes forget their password. There is no recovery flow (no email,
no reset link) — the only way back in is for an admin to set a new password
for them directly.

## Goal

Let an admin, from the existing Players tab in the admin section, pick a
player and set a new password for them. No password strength rules. The admin
never sees the password in plain text while typing — the player dictates it
(e.g. over chat/in person) and the admin types it in, confirmed by a second
entry to guard against typos. Must work comfortably on mobile.

## Design

### 1. API: `POST /api/admin/players/[id]/password`

New route file `src/app/api/admin/players/[id]/password/route.ts`, following
the same shape as the existing `src/app/api/admin/players/[id]/achievements/route.ts`:

- `requireAdmin()`.
- Load `{ id: playerId } = await params`, read `newPassword` from the JSON
  body (`typeof body.newPassword === "string" ? body.newPassword : ""`).
- 404 if `prisma.user.findUnique({ where: { id: playerId } })` is missing or
  `role !== "player"` (same check as the existing player routes).
- 400 if `newPassword` is empty — this is a basic "field was sent" guard, not
  a strength rule.
- `hashPassword(newPassword)` (from `@/lib/auth`, already used by
  `api/auth/register`) → `prisma.user.update({ where: { id: playerId }, data: { passwordHash } })`.
- Invalidate the player's existing sessions: `prisma.session.deleteMany({ where: { userId: playerId } })`.
  They'll need to log in again with the new password. (Confirmed with the
  user this is fine either way for this app's audience — invalidating is the
  safer default.)
- Return `NextResponse.json({ ok: true })`.
- Wrap in try/catch → `handleApiError(err)`, matching every other admin route.

No length/complexity validation — matches the explicit ask.

### 2. Frontend: `PlayersTab.tsx`

Add a "Změnit heslo" button next to the existing "+ Přidat achievement"
button in the player detail header row.

New modal state, mirroring the existing add-achievement modal
(`addModalOpen`/`pickedId`/`addError`/`submitting`):

```ts
const [pwModalOpen, setPwModalOpen] = useState(false);
const [newPassword, setNewPassword] = useState("");
const [newPassword2, setNewPassword2] = useState("");
const [pwError, setPwError] = useState("");
const [pwSubmitting, setPwSubmitting] = useState(false);
```

Modal content (reuses `Modal`/`ModalField` from `./Modal`):

- Two `<input type="password" className="cca-input" />` fields ("Nové heslo",
  "Nové heslo znovu"), each `style={{ minHeight: 44, padding: "10px 14px" }}`
  to match the existing mobile-friendly input sizing used elsewhere in this
  file (e.g. the player search box) — 44px touch target, and font size stays
  at the `cca-input` default (already ≥16px elsewhere in the app, avoids iOS
  auto-zoom on focus).
- Save button (`variant="gold"`, `fullWidth`) disabled when either field is
  empty or the two don't match; label reflects submitting state ("Ukládám…").
- If the user tries to save with mismatched values, show inline error "Hesla
  se neshodují." (checked client-side before calling the API — the API itself
  doesn't know about the confirmation field at all, only `newPassword`).
- Cancel button closes the modal and resets the three string/error fields.

On successful save: close the modal, clear the fields, no need to reload
player detail/list (password isn't part of either).

## Out of scope

- No password strength/length validation, client or server side.
- No "show password" toggle — fields stay masked (`type="password"`)
  throughout, per the explicit ask.
- No email/notification to the player about the change.
- No audit trail entry (the existing "Historie ručních úprav" list is scoped
  to achievement grants via `Submission.source === "admin_manual"`; a
  password change isn't a `Submission` and isn't added there).

## Files touched

- `src/app/api/admin/players/[id]/password/route.ts` — new route.
- `src/components/admin/PlayersTab.tsx` — add button + modal + handler.
