import { NextResponse } from "next/server";
import { currentSession, ensureAdminUser, toPublicUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { mutateStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureAdminUser();
  const session = await currentSession();
  const { id } = await params;
  const body = (await request.json()) as {
    active?: boolean;
    role?: Role;
    password?: string;
    name?: string;
  };

  try {
    const user = mutateStore((store) => {
      const item = store.users.find((entry) => entry.id === id);
      if (!item) throw new Error("User not found");
      if (item.id === session?.id && body.active === false) {
        throw new Error("You cannot disable your own account");
      }
      if (item.id === session?.id && body.role === "user") {
        throw new Error("You cannot remove your own admin role");
      }
      if (typeof body.active === "boolean") item.active = body.active;
      if (body.role === "admin" || body.role === "user") item.role = body.role;
      if (body.name?.trim()) item.name = body.name.trim();
      if (body.password) {
        if (body.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        item.passwordHash = hashPassword(body.password);
      }
      return toPublicUser(item);
    });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not update user",
      },
      { status: 400 },
    );
  }
}
