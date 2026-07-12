import { NextRequest, NextResponse } from "next/server";
import { createSession, findUserByUsernameCI, verifyPassword } from "@/lib/auth";
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

    const user = await findUserByUsernameCI(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Nesprávné uživatelské jméno nebo heslo." },
        { status: 401 },
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
