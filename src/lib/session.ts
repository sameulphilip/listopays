import { createHmac } from "crypto";
import type { Role } from "./types";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  exp: number;
};

const COOKIE = "lp_session";
const TTL_SEC = 60 * 60 * 24 * 14;

export function sessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.LISTOPAYS_PRIVATE_KEY ||
    "listopays-console-session"
  );
}

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
}) {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, sessionSecret())}`;
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, sessionSecret());
  if (expected.length !== sig.length) return null;
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return null;
  const { timingSafeEqual } = require("crypto") as typeof import("crypto");
  if (!timingSafeEqual(a, b)) return null;
  try {
    const user = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionUser;
    if (!user.id || !user.role || user.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: TTL_SEC,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export const SESSION_COOKIE = COOKIE;
