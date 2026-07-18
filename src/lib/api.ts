import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof Error) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("Unknown error:", err);
  return NextResponse.json({ error: "Neznámá chyba." }, { status: 500 });
}
