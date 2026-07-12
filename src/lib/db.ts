import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Live event = many phones hitting the API concurrently against a single
// SQLite file. WAL lets reads proceed while a write is in flight, and a
// generous busy_timeout makes concurrent writers queue instead of throwing
// SQLITE_BUSY.
function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  const client = new PrismaClient({ adapter });

  client.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
  client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;").catch(() => {});

  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
