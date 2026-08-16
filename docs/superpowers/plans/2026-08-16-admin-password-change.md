# Admin Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin set a new password for a player from the admin Players tab, without ever seeing the password in plain text, with a confirm-by-retyping check before submit.

**Architecture:** A new `POST /api/admin/players/[id]/password` route (mirrors the existing `POST /api/admin/players/[id]/achievements` route) hashes the given password with the existing `hashPassword` helper, updates `User.passwordHash`, and deletes the player's sessions so they must log in again. `PlayersTab.tsx` gets a "Změnit heslo" button in the player detail header that opens a `Modal` with two masked (`type="password"`) inputs; the confirm-match check happens client-side before the request is sent — the API itself only ever receives a single `newPassword` string.

**Tech Stack:** Next.js App Router (custom fork — see `AGENTS.md`), TypeScript, Prisma (SQLite), `bcryptjs` via `@/lib/auth`, client components with `useState` + the shared `apiFetch` helper, inline `style={{ }}` objects using CSS custom-property design tokens (no Tailwind).

## Global Constraints

- All UI copy is Czech, matching existing strings in `PlayersTab.tsx`.
- No password strength/length validation, client or server — only "was something typed" and "do the two entries match".
- Password inputs must stay masked (`type="password"`) — the admin never sees the plaintext.
- Touch-friendly sizing on inputs: `minHeight: 44` (matches the existing search input in this file), so the modal is comfortable on mobile.
- Changing the password invalidates the player's existing sessions (`prisma.session.deleteMany`).
- This repo has zero test infrastructure (no runner, no config, no existing test files). Do not introduce one. Verify manually via the dev server / curl instead of writing automated tests.
- Follow existing admin route conventions exactly: `requireAdmin()` first, 404 via `{ error: "Hráč nenalezen." }` when the target isn't a `role: "player"` user, `handleApiError(err)` in the catch block.

---

### Task 1: `POST /api/admin/players/[id]/password`

**Files:**
- Create: `src/app/api/admin/players/[id]/password/route.ts`

**Interfaces:**
- Consumes: `hashPassword` and `requireAdmin` from `@/lib/auth`, `prisma` from `@/lib/db`, `handleApiError` from `@/lib/api` — all already used identically in `src/app/api/admin/players/[id]/achievements/route.ts`.
- Produces: `POST /api/admin/players/:id/password` accepting JSON body `{ newPassword: string }`, returning `{ ok: true }` on success. Task 2 calls this endpoint by URL and body shape — no shared TS types between the two tasks.

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: playerId } = await params;
    const body = await request.json();
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const player = await prisma.user.findUnique({ where: { id: playerId } });
    if (!player || player.role !== "player") {
      return NextResponse.json({ error: "Hráč nenalezen." }, { status: 404 });
    }

    if (!newPassword) {
      return NextResponse.json({ error: "Zadej nové heslo." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: playerId }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId: playerId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Manually verify against a real player**

Run: `npm run dev`

Log in as an admin in one browser (or note the admin session cookie), and in
another session (e.g. a private/incognito window) log in as an existing
player and note their username/password. With the admin session, send:

```bash
curl -i -X POST http://localhost:3000/api/admin/players/<PLAYER_ID>/password \
  -H "Content-Type: application/json" \
  -H "Cookie: ccm_session=<ADMIN_SESSION_COOKIE_VALUE>" \
  -d "{\"newPassword\":\"nove-heslo-123\"}"
```

(Get `<PLAYER_ID>` from `GET /api/admin/players`; get the admin's cookie value
from the browser's dev tools after logging in as admin — cookie name is
`ccm_session` per `src/lib/auth.ts`, unless `SESSION_COOKIE_NAME` is set.)

Expected: `200 OK` with `{"ok":true}`. Then confirm:
- The player's other browser session is now logged out (reload any page there
  — should redirect to login, since their session row was deleted).
- The player can log in again at `/login` using `nove-heslo-123`.
- Repeating the same curl with `<PLAYER_ID>` set to an admin's own id (or any
  non-player user) returns `404` with `{"error":"Hráč nenalezen."}`.
- Repeating with `newPassword` omitted/empty returns `400` with
  `{"error":"Zadej nové heslo."}`.
- Repeating without the admin cookie (or with a player's cookie) returns
  `403` (`requireAdmin` failure) or `401`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/players/[id]/password/route.ts"
git commit -m "feat: add admin endpoint to change a player's password"
```

---

### Task 2: "Změnit heslo" button + modal in `PlayersTab.tsx`

**Files:**
- Modify: `src/components/admin/PlayersTab.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/players/:id/password` from Task 1, called via the existing `apiFetch` helper exactly like `confirmAdd`/`removeAchievement` in this same file call their endpoints.
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add password-modal state**

In `PlayersTab.tsx`, alongside the existing add-achievement modal state
(after line 37, `const [submitting, setSubmitting] = useState(false);`), add:

```ts
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
```

- [ ] **Step 2: Add open/close/save handlers**

Add these functions after the existing `removeAchievement` function (after
line 111, right before the `return (` on line 113):

```ts
  function openPasswordModal() {
    setNewPassword("");
    setNewPassword2("");
    setPwError("");
    setPwModalOpen(true);
  }

  function closePasswordModal() {
    setPwModalOpen(false);
    setNewPassword("");
    setNewPassword2("");
    setPwError("");
  }

  async function savePassword() {
    if (!selectedId || !newPassword || !newPassword2 || pwSubmitting) return;
    if (newPassword !== newPassword2) {
      setPwError("Hesla se neshodují.");
      return;
    }
    setPwError("");
    setPwSubmitting(true);
    try {
      await apiFetch(`/api/admin/players/${selectedId}/password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      closePasswordModal();
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setPwSubmitting(false);
    }
  }
```

- [ ] **Step 3: Add the "Změnit heslo" button to the player detail header**

The player detail card currently opens with (lines 167-173):

```tsx
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-3)" }}>
            <span style={{ font: "var(--text-heading-lg)", color: "var(--text-heading)" }}>{detail.player.name}</span>
            <span style={{ font: "400 34px/1 var(--font-display)", color: "var(--accent-gold)" }}>
              {detail.player.points}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
```

Insert a new row between them, right after the name/points row's closing
`</div>` and before the achievements-section-header `<div>`:

```tsx
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={openPasswordModal}>
              Změnit heslo
            </Button>
          </div>
```

- [ ] **Step 4: Add the password modal**

Immediately after the existing add-achievement `<Modal>` block's closing
`)}` (currently ending at line 323, right before the final `</div>` /
closing `);` of the component), add:

```tsx
      {pwModalOpen && (
        <Modal onClose={closePasswordModal}>
          <span style={{ font: "var(--text-heading-md)", color: "var(--text-heading)" }}>
            Změnit heslo
          </span>
          <ModalField label="Nové heslo">
            <input
              type="password"
              className="cca-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ minHeight: 44, padding: "10px 14px" }}
            />
          </ModalField>
          <ModalField label="Nové heslo znovu">
            <input
              type="password"
              className="cca-input"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              style={{ minHeight: 44, padding: "10px 14px" }}
            />
          </ModalField>
          {pwError && <span style={{ color: "var(--status-pending-fg)" }}>{pwError}</span>}
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <Button variant="ghost" size="md" fullWidth onClick={closePasswordModal}>
              Zrušit
            </Button>
            <Button
              variant="gold"
              size="md"
              fullWidth
              disabled={!newPassword || !newPassword2 || pwSubmitting}
              onClick={savePassword}
            >
              {pwSubmitting ? "Ukládám…" : "Uložit"}
            </Button>
          </div>
        </Modal>
      )}
```

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Manually verify in the browser**

With `npm run dev` running, log in as admin, go to the admin Players tab,
select a player, and:

- Confirm a "Změnit heslo" button appears in the detail card header, aligned
  right, above the "Splněné achievementy" row.
- Click it — a modal opens with two masked password fields ("Nové heslo",
  "Nové heslo znovu") and Zrušit/Uložit buttons. "Uložit" is disabled while
  either field is empty.
- Type mismatched values in the two fields and click "Uložit" — an inline
  "Hesla se neshodují." error appears, and the modal stays open.
- Fix the second field to match the first, click "Uložit" — the modal
  closes with no error.
- Shrink the browser to a mobile width (or use device emulation) and confirm
  both inputs and buttons remain comfortably tappable (44px+ tall, no
  layout overflow).
- Log in as that player in a separate/incognito session beforehand; after
  the admin's password change, confirm that session is logged out and the
  player can only log back in with the new password (same check as Task 1
  Step 2, now driven through the UI instead of curl).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/PlayersTab.tsx
git commit -m "feat: add change-password modal to admin Players tab"
```
