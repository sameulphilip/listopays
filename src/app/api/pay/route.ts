import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { originFromRequest, publicCheckoutUrl } from "@/lib/checkout";
import {
  createPayment,
  findOrCreateCustomer,
  tokenFromUrl,
} from "@/lib/listopays";
import { SHARED_OFFER } from "@/lib/offer";
import { logActivity, mutateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = originFromRequest(request);
  return NextResponse.json({
    success: true,
    data: {
      amount: SHARED_OFFER.amount,
      currency: SHARED_OFFER.currency,
      url: `${origin}${SHARED_OFFER.path}`,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Email is invalid" },
        { status: 400 },
      );
    }

    const resolved = await findOrCreateCustomer({ name, email });
    const customer = resolved.uuid;
    const existing = resolved.created ? null : resolved;

    const url = await createPayment({
      customer,
      order: SHARED_OFFER.order,
      amount: SHARED_OFFER.amount,
      currency: SHARED_OFFER.currency,
    });
    const token = tokenFromUrl(url);
    const origin = originFromRequest(request);
    const checkoutUrl = publicCheckoutUrl(token, origin);

    mutateStore((store) => {
      store.payments.unshift({
        id: randomUUID(),
        token,
        url,
        customer,
        customerName: existing?.name ?? name,
        customerEmail: email,
        order: SHARED_OFFER.order,
        amount: SHARED_OFFER.amount,
        currency: SHARED_OFFER.currency,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (!existing) {
        logActivity(store, {
          kind: "customer",
          title: `New customer: ${name}`,
          detail: email,
        });
      }
      logActivity(store, {
        kind: "payment",
        title: `Shared checkout ${SHARED_OFFER.amount} ${SHARED_OFFER.currency}`,
        detail: email,
      });
    });

    return NextResponse.json({ success: true, data: { url: checkoutUrl, token } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not start checkout",
      },
      { status: 502 },
    );
  }
}
