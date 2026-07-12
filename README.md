# České chlevy a márnice — Achievement tracker

Guild-meetup achievement tracker. Next.js (App Router, TypeScript) full-stack app,
SQLite via Prisma, self-hosted.

## Getting started

```bash
npm install
 # creates prisma/dev.db and applies the schema 
npx prisma migrate dev    # dev
npx prisma migrate deploy # production
# categories, sample achievements, one admin user
npm run db:seed           
npm run dev
```

Open http://localhost:3000. Seeded admin login: **gm / pivo123** — change the
password after first login (there is no in-app password-change flow yet;
register a new admin the normal way, or update the `passwordHash` column
directly, see below).

`migrate dev` and `db:seed` are one-time initial setup (both are safe to
re-run — `migrate dev` just applies any not-yet-applied migrations, and
`db:seed` upserts, so it won't duplicate data or touch an existing admin's
password — but you only need them once). On the real server, use
`npx prisma migrate deploy` instead of `migrate dev` (non-interactive,
production-safe); re-run it again in the future only when a new migration
ships.

## Adding another admin

There is deliberately no in-app role-management UI. To promote a user
(who has already registered normally) to admin, run this against
`prisma/dev.db` directly (e.g. via `sqlite3 prisma/dev.db`, DBeaver, or
`npx prisma studio`):

```sql
UPDATE User SET role = 'admin' WHERE username = '...';
```

## Backups

This is a one-shot live event running on a single SQLite file — a disk
failure or bad write mid-event would be painful, so back it up on a timer
while the app is running:

```bash
npm run backup
```

This uses SQLite's online backup API (via `better-sqlite3`'s `.backup()`),
which is safe to run against a live, in-use database — unlike a plain file
copy, it won't grab a half-written page. Backups land in `prisma/backups/`
as timestamped `.db` files (gitignored; copy them off-box periodically too).

Schedule it to run every few minutes for the duration of the event:

**Windows (Task Scheduler)**, run once from an elevated PowerShell prompt in
the project directory to register a task that fires every 5 minutes:

```powershell
$action = New-ScheduledTaskAction -Execute "npm.cmd" -Argument "run backup" -WorkingDirectory (Get-Location)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3)
Register-ScheduledTask -TaskName "ChlivekAchievementsBackup" -Action $action -Trigger $trigger
```

Remove it after the event with `Unregister-ScheduledTask -TaskName "ChlivekAchievementsBackup"`.

**Linux/macOS (cron)**, add to crontab (`crontab -e`) for every 5 minutes:

```
*/5 * * * * cd /var/www/chlivek.fredrik.cz && npm run backup >> /var/log/ccm-backup.log 2>&1
```

## Notes

- SQLite is opened with `journal_mode = WAL` and `busy_timeout = 5000` (see
  `src/lib/db.ts`) so concurrent writes from multiple phones during the
  event queue instead of failing outright.
- Proof-of-completion photos are written to `public/uploads/` on disk
  (gitignored) — this assumes a self-hosted deployment with a persistent
  filesystem, not a serverless/ephemeral host.
