import { NextResponse } from "next/server";
import { isPaymentToken } from "@/lib/checkout";
import { markPaymentPaid } from "@/lib/payment-status";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = body.token?.trim() ?? "";
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  if (!isPaymentToken(token)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const result = await markPaymentPaid(token);
  if (!result.confirmed) {
    return NextResponse.json({ success: false }, { status: 409 });
  }
  return NextResponse.json({
    success: true,
    data: { status: result.payment?.status ?? "success" },
  });
}
