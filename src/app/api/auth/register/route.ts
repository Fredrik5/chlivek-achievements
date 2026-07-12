import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, findUserByUsernameCI, hashPassword } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vyplň uživatelské jméno i heslo." },
        { status: 400 },
      );
    }
    if (username.length > 32) {
      return NextResponse.json(
        { error: "Uživatelské jméno je moc dlouhé (max 32 znaků)." },
        { status: 400 },
      );
    }
    if (password.length < 4) {
      return NextResponse.json(
        { error: "Heslo musí mít aspoň 4 znaky." },
        { status: 400 },
      );
    }

    const existing = await findUserByUsernameCI(username);
    if (existing) {
      return NextResponse.json(
        { error: "Toto uživatelské jméno už existuje." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, role: "player" },
    });

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
