import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { hashPassword } from "./password";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionUser,
} from "./session";
import { mutateStore, readStore, writeStore } from "./store";
import type { ConsoleUser, PublicUser, Role } from "./types";

const DEFAULT_ADMIN_EMAIL = "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin#2026";

export function toPublicUser(user: ConsoleUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

export function ensureAdminUser() {
  const store = readStore();
  if (store.users.length > 0) return;
  const admin: ConsoleUser = {
    id: randomUUID(),
    name: "Administrator",
    email: DEFAULT_ADMIN_EMAIL,
    role: "admin",
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    active: true,
    createdAt: new Date().toISOString(),
  };
  store.users = [admin];
  writeStore(store);
}

export function findUserByEmail(email: string) {
  ensureAdminUser();
  return readStore().users.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

export function listUsers(): PublicUser[] {
  ensureAdminUser();
  return readStore().users.map(toPublicUser);
}

export function createConsoleUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  return mutateStore((store) => {
    if (
      store.users.some(
        (user) => user.email.toLowerCase() === input.email.toLowerCase(),
      )
    ) {
      throw new Error("A user with this email already exists");
    }
    const user: ConsoleUser = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordHash: hashPassword(input.password),
      active: true,
      createdAt: new Date().toISOString(),
    };
    store.users.unshift(user);
    return toPublicUser(user);
  });
}

export async function currentSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}
