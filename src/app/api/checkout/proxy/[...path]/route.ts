import { NextResponse } from "next/server";
import { GATEWAY_ORIGIN, rewriteCheckoutHtml } from "@/lib/checkout";

export const dynamic = "force-dynamic";

async function proxy(request: Request, path: string[]) {
  if (path.some((part) => part === ".." || part.includes("\\"))) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const incoming = new URL(request.url);
  const dest = new URL(`${GATEWAY_ORIGIN}/${path.join("/")}`);
  dest.search = incoming.search;

  const headers = new Headers();
  const pass = ["accept", "content-type", "user-agent"];
  for (const key of pass) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(dest, init);
  const location = upstream.headers.get("location");
  if (location && upstream.status >= 300 && upstream.status < 400) {
    const target = new URL(location, dest);
    if (target.hostname === "pay.listopays.com") {
      return NextResponse.redirect(
        new URL(`/api/checkout/proxy${target.pathname}${target.search}`, request.url),
        upstream.status,
      );
    }
  }

  const type = upstream.headers.get("content-type") || "application/octet-stream";
  if (type.includes("text/html")) {
    const html = rewriteCheckoutHtml(await upstream.text());
    return new NextResponse(html, {
      status: upstream.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "content-type": type,
      "cache-control": "no-store",
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function POST(request: Request, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function PUT(request: Request, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function PATCH(request: Request, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function DELETE(request: Request, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
