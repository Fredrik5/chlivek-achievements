import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const MAX_ICON_BYTES = 2 * 1024 * 1024;
const ICON_DIR = path.join(process.cwd(), "public", "icons");

async function deleteIconFile(iconPath: string | null) {
  if (!iconPath) return;
  await fs.unlink(path.join(process.cwd(), "public", iconPath)).catch(() => {});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    const form = await request.formData();
    const icon = form.get("icon");
    if (!(icon instanceof File) || icon.size === 0) {
      return NextResponse.json({ error: "Vyber soubor s ikonou." }, { status: 400 });
    }
    if (!icon.type.startsWith("image/")) {
      return NextResponse.json({ error: "Ikona musí být obrázek." }, { status: 400 });
    }
    if (icon.size > MAX_ICON_BYTES) {
      return NextResponse.json({ error: "Ikona je moc velká (max 2 MB)." }, { status: 400 });
    }

    const ext = icon.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await icon.arrayBuffer());
    await fs.mkdir(ICON_DIR, { recursive: true });
    await fs.writeFile(path.join(ICON_DIR, filename), bytes);
    const iconPath = `/icons/${filename}`;

    await deleteIconFile(achievement.iconPath);
    const updated = await prisma.achievement.update({ where: { id }, data: { iconPath } });

    return NextResponse.json({ iconPath: updated.iconPath });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const achievement = await prisma.achievement.findUnique({ where: { id } });
    if (!achievement) {
      return NextResponse.json({ error: "Achievement nenalezen." }, { status: 404 });
    }

    await deleteIconFile(achievement.iconPath);
    await prisma.achievement.update({ where: { id }, data: { iconPath: null } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
