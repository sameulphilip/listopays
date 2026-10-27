import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { tokenFromUrl, verifyWebhookPrivateKey } from "@/lib/listopays";
import {
  applyPaymentStatus,
  normalizePaymentStatus,
} from "@/lib/payment-status";
import { logActivity, mutateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Incoming = {
  transaction?: string;
  order_id?: string;
  status?: string;
  private_key?: string;
  metadata?: {
    customer_id?: string;
    email?: string;
    amount?: number;
    currency?: string;
    descriptor?: string;
  };
};

export async function GET() {
  const { readStore } = await import("@/lib/store");
  return NextResponse.json({ success: true, data: readStore().webhooks });
}

export async function POST(request: Request) {
  let payload: Incoming = {};
  try {
    payload = (await request.json()) as Incoming;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const valid = verifyWebhookPrivateKey(payload.private_key);
  mutateStore((store) => {
    store.webhooks.unshift({
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      valid,
      transaction: payload.transaction,
      orderId: payload.order_id,
      status: payload.status,
      payload,
    });
    store.webhooks = store.webhooks.slice(0, 200);

    if (valid) {
      const status = normalizePaymentStatus(payload.status) ?? "success";
      applyPaymentStatus(
        store,
        {
          token: payload.transaction
            ? tokenFromUrl(payload.transaction)
            : undefined,
          orderId: payload.order_id,
        },
        status,
      );
    }

    logActivity(store, {
      kind: "webhook",
      title: valid ? "Webhook accepted" : "Webhook rejected",
      detail: payload.transaction || payload.order_id,
    });
  });

  if (!valid) {
    return NextResponse.json(
      { success: false, error: "Private key mismatch" },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true });
}
