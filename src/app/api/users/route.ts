import { NextResponse } from "next/server";
import {
  createConsoleUser,
  currentSession,
  ensureAdminUser,
  listUsers,
} from "@/lib/auth";
import { logActivity, mutateStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureAdminUser();
  return NextResponse.json({ success: true, data: listUsers() });
}

export async function POST(request: Request) {
  const session = await currentSession();
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role === "admin" ? "admin" : "user";
  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      {
        success: false,
        error: "Name, email, and a password of at least 8 characters are required",
      },
      { status: 400 },
    );
  }
  try {
    const user = createConsoleUser({ name, email, password, role });
    mutateStore((store) => {
      logActivity(store, {
        kind: "system",
        title: `User created: ${user.name}`,
        detail: `${user.role} by ${session?.name ?? "admin"}`,
      });
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not create user",
      },
      { status: 400 },
    );
  }
}
