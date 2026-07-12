// Hot-copies the live SQLite DB via better-sqlite3's .backup() (uses
// SQLite's online backup API, safe to run while the app is writing to the
// DB — unlike a raw file copy, which can grab a half-written page).
//
// Usage: node scripts/backup-db.mjs
// Schedule this to run every few minutes during the event (see README).
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dbPath = path.join(projectRoot, "prisma", "dev.db");
const backupDir = path.join(projectRoot, "prisma", "backups");

if (!fs.existsSync(dbPath)) {
  console.error(`No database found at ${dbPath} — nothing to back up.`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destPath = path.join(backupDir, `dev-${timestamp}.db`);

const db = new Database(dbPath, { readonly: true });
try {
  await db.backup(destPath);
  console.log(`Backup written to ${destPath}`);
} finally {
  db.close();
}
