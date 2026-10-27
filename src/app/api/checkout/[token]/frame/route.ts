import { NextResponse } from "next/server";
import {
  gatewayPaymentUrl,
  isPaymentToken,
  rewriteCheckoutHtml,
} from "@/lib/checkout";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isPaymentToken(token)) {
    return NextResponse.json({ success: false, error: "Invalid link" }, { status: 404 });
  }

  const upstream = await fetch(gatewayPaymentUrl(token), {
    headers: {
      accept: "text/html",
      "user-agent": request.headers.get("user-agent") || "Mozilla/5.0",
    },
    cache: "no-store",
  });

  const html = rewriteCheckoutHtml(await upstream.text());
  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
