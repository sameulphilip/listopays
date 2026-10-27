import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { refundPayment } from "@/lib/listopays";
import { logActivity, mutateStore, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, data: readStore().refunds });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim() ?? "";
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Payment token is required" },
        { status: 400 },
      );
    }

    const existing = readStore().payments.find((p) => p.token === token);
    if (existing && existing.status !== "success") {
      return NextResponse.json(
        { success: false, error: "Only paid payments can be refunded" },
        { status: 409 },
      );
    }

    await refundPayment(token);
    const record = mutateStore((store) => {
      const item = {
        id: randomUUID(),
        token,
        success: true,
        error: null,
        createdAt: new Date().toISOString(),
      };
      store.refunds.unshift(item);
      const payment = store.payments.find((p) => p.token === token);
      if (payment) {
        payment.status = "refunded";
        payment.updatedAt = new Date().toISOString();
      }
      logActivity(store, {
        kind: "refund",
        title: "Payment refunded",
        detail: token,
      });
      return item;
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Refund failed",
      },
      { status: 502 },
    );
  }
}
