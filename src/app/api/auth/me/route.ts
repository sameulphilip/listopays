import { NextResponse } from "next/server";
import {
  currentSession,
  ensureAdminUser,
  findUserByEmail,
  toPublicUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureAdminUser();
  const session = await currentSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Sign in required" },
      { status: 401 },
    );
  }
  const user = findUserByEmail(session.email);
  if (!user || !user.active) {
    return NextResponse.json(
      { success: false, error: "Account disabled" },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, data: toPublicUser(user) });
}
