import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const ADMIN_USERNAME = "gm";
const ADMIN_PASSWORD = "pivo123"; // change after first login

async function main() {
  await prisma.eventSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      eventName: "Guildovní sraz — Podzim 2026",
      leaderboardVisible: true,
    },
  });

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      username: ADMIN_USERNAME,
      passwordHash: adminPasswordHash,
      role: "admin",
    },
  });

  const categoryNames = [
    "Pitkarské",
    "Aktivity",
    "Guildovní duch",
    "Kuchyně a chlast",
    "Výlety",
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = cat.id;
  }

  const normalAchievements: Array<{
    title: string;
    description: string;
    points: number;
    category: string;
  }> = [
    {
      title: "Vypij 10 piv",
      description: "Zvládni 10 piv během srazu.",
      points: 10,
      category: "Pitkarské",
    },
    {
      title: "Vypij 5 panáků",
      description: "Zvládni 5 panáků během srazu.",
      points: 10,
      category: "Pitkarské",
    },
    {
      title: "Dej si panáka s oficírem",
      description: "Dej si panáka s oficírem.",
      points: 10,
      category: "Pitkarské",
    },
    {
      title: "Vypij pivo a panáka do 15s",
      description: "Vypij pivo a panáka do 15s.",
      points: 10,
      category: "Pitkarské",
    },
    {
      title: "Leeeerooooooy!!!",
      description:
        "Bez varování spusť panákovou rundu se slovy „LEEROY JENKINS!!!“",
      points: 25,
      category: "Pitkarské",
    },
    {
      title: "Výletník",
      description: "Vyraž na výlet do okolí.",
      points: 10,
      category: "Výlety",
    },
    {
      title: "Aktivista",
      description: "Zúčasni se sportovní aktivity.",
      points: 10,
      category: "Aktivity",
    },
    {
      title: "Kdo si hraje, nezlobí",
      description: "Zahraj si na srazu společenskou hru.",
      points: 10,
      category: "Aktivity",
    },
  ];

  for (const a of normalAchievements) {
    const existing = await prisma.achievement.findFirst({
      where: { title: a.title, isSecret: false },
    });
    if (existing) continue;
    await prisma.achievement.create({
      data: {
        title: a.title,
        description: a.description,
        points: a.points,
        categoryId: categories[a.category],
        isSecret: false,
        requiresApproval: true,
      },
    });
  }

  const secretAchievements: Array<{
    title: string;
    description: string;
    points: number;
  }> = [
    {
      title: "Mrglwglwlg!",
      description: "Vydej ze sebe zvuk murloka, aniž by tě k tomu někdo vyzval.",
      points: 150,
    },
    {
      title: "Baby Murlock",
      description: "Usni jako první ze všech účastníků srazu.",
      points: 150,
    },
    {
      title: "Kdo to sakra je",
      description:
        "Officer si u tebe nevzpomene na jméno, i když jste v guildě spolu roky.",
      points: 150,
    },
    {
      title: "Duch minulého srazu",
      description:
        "Někdo tě spojí s historkou z předchozího srazu, o které vůbec nevíš.",
      points: 150,
    },
    {
      title: "Vzkříšení",
      description: "Vrať se na sraz poté, co jsi ho už jednou opustil.",
      points: 150,
    },
    {
      title: "Tajný patron",
      description: "Zaplať rundu, aniž by kdokoliv zjistil, kdo ji zaplatil.",
      points: 150,
    },
  ];

  for (const s of secretAchievements) {
    const existing = await prisma.achievement.findFirst({
      where: { title: s.title, isSecret: true },
    });
    if (existing) continue;
    await prisma.achievement.create({
      data: {
        title: s.title,
        description: s.description,
        points: s.points,
        isSecret: true,
        requiresApproval: false,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  console.log(
    "To promote another user to admin later, run directly against the DB:",
  );
  console.log(`  UPDATE User SET role = 'admin' WHERE username = '...';`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
