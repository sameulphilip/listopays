import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { originFromRequest, withPublicUrl } from "@/lib/checkout";
import {
  createPayment,
  findOrCreateCustomer,
  tokenFromUrl,
} from "@/lib/listopays";
import { syncPendingPayments } from "@/lib/payment-status";
import { logActivity, mutateStore, readStore } from "@/lib/store";
import { CURRENCIES, type Currency } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await syncPendingPayments();
  const origin = originFromRequest(request);
  return NextResponse.json({
    success: true,
    data: readStore().payments.map((item) => withPublicUrl(item, origin)),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      customer?: string;
      customerName?: string;
      customerEmail?: string;
      order?: string;
      amount?: number | string;
      currency?: string;
    };
    const name = body.customerName?.trim() ?? "";
    const email = body.customerEmail?.trim().toLowerCase() ?? "";
    let customer = body.customer?.trim() ?? "";
    const order = body.order?.trim() ?? "";
    const amount = Number(body.amount);
    const currency = (body.currency ?? "EUR") as Currency;
    let customerCreated = false;

    if (name && email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { success: false, error: "Email is invalid" },
          { status: 400 },
        );
      }
      const resolved = await findOrCreateCustomer({ name, email });
      customer = resolved.uuid;
      customerCreated = resolved.created;
    }
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer name and email are required" },
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
    if (!CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { success: false, error: "Currency is not supported" },
        { status: 400 },
      );
    }

    const url = await createPayment({ customer, order, amount, currency });
    const token = tokenFromUrl(url);
    const record = mutateStore((store) => {
      const item = {
        id: randomUUID(),
        token,
        url,
        customer,
        customerName: name || body.customerName,
        customerEmail: email || body.customerEmail,
        order,
        amount,
        currency,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.payments.unshift(item);
      if (customerCreated) {
        logActivity(store, {
          kind: "customer",
          title: `New customer: ${name || item.customerName}`,
          detail: email || item.customerEmail,
        });
      }
      logActivity(store, {
        kind: "payment",
        title: `Payment link ${amount} ${currency}`,
        detail: order,
      });
      return item;
    });

    return NextResponse.json({
      success: true,
      data: withPublicUrl(record, originFromRequest(request)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not create payment link",
      },
      { status: 502 },
    );
  }
}
