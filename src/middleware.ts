import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/pay",
  "/api/pay",
  "/p/",
  "/payment/",
  "/img/",
  "/brand/",
  "/api/checkout",
  "/api/auth/login",
];

const ADMIN_PREFIXES = [
  "/users",
  "/settings",
  "/refunds",
  "/charges",
  "/webhooks",
  "/api/users",
  "/api/settings",
  "/api/refund",
  "/api/charge",
  "/api/webhook",
];

function isPublic(path: string, method: string) {
  if (path === "/api/webhook") return method === "POST";
  if (path === "/favicon.ico") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix),
  );
}

function isAdminPath(path: string) {
  return ADMIN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function b64urlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  let bin = "";
  view.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return bytesToB64url(sig);
}

async function readSession(token?: string) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const secret =
    process.env.SESSION_SECRET ||
    process.env.LISTOPAYS_PRIVATE_KEY ||
    "listopays-console-session";
  const expected = await hmac(body, secret);
  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;
  try {
    const json = new TextDecoder().decode(b64urlToBytes(body));
    const user = JSON.parse(json) as {
      id: string;
      role: "admin" | "user";
      exp: number;
    };
    if (!user.id || user.exp < Math.floor(Date.now() / 1000)) return null;
    return user;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname, request.method)) return NextResponse.next();

  const session = await readSession(request.cookies.get("lp_session")?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Sign in required" },
        { status: 401 },
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdminPath(pathname) && session.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.png$).*)",
  ],
};
