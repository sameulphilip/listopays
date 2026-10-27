import { NextResponse } from "next/server";
import { ensureAdminUser, findUserByEmail, toPublicUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, sessionCookie } from "@/lib/session";
import { logActivity, mutateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  ensureAdminUser();
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "Email and password are required" },
      { status: 400 },
    );
  }

  const user = findUserByEmail(email);
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 },
    );
  }

  mutateStore((store) => {
    logActivity(store, {
      kind: "system",
      title: `${user.name} signed in`,
      detail: user.role,
    });
  });

  const token = createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  const res = NextResponse.json({ success: true, data: toPublicUser(user) });
  const cookie = sessionCookie(token);
  res.cookies.set(cookie);
  return res;
}
