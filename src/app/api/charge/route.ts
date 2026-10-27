import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { chargeCustomer } from "@/lib/listopays";
import { logActivity, mutateStore, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, data: readStore().charges });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customer?: string;
      customerName?: string;
      order?: string;
      amount?: number | string;
    };
    const customer = body.customer?.trim() ?? "";
    const order = body.order?.trim() ?? "";
    const amount = Number(body.amount);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer is required" },
        { status: 400 },
      );
    }
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order note is required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount is invalid" },
        { status: 400 },
      );
    }

    await chargeCustomer({ customer, order, amount });
    const record = mutateStore((store) => {
      const item = {
        id: randomUUID(),
        customer,
        customerName: body.customerName,
        order,
        amount,
        success: true,
        error: null,
        createdAt: new Date().toISOString(),
      };
      store.charges.unshift(item);
      logActivity(store, {
        kind: "charge",
        title: `Direct charge ${amount}`,
        detail: order,
      });
      return item;
    });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Charge failed";
    mutateStore((store) => {
      store.charges.unshift({
        id: randomUUID(),
        customer: "",
        order: "",
        amount: 0,
        success: false,
        error: message,
        createdAt: new Date().toISOString(),
      });
    });
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 },
    );
  }
}
