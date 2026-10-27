import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import {
  getDescriptor,
  listCustomers,
  merchantName,
} from "@/lib/listopays";
import { recentPayments, syncPendingPayments } from "@/lib/payment-status";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await syncPendingPayments();
  const store = readStore();
  const session = await currentSession();
  const isAdmin = session?.role === "admin";

  const base = {
    success: true,
    merchantName: merchantName(),
    customers: 0,
    payments: store.payments.length,
    pending: store.payments.filter((p) => p.status === "pending").length,
    succeeded: store.payments.filter((p) => p.status === "success").length,
    refunded: store.payments.filter((p) => p.status === "refunded").length,
    charges: isAdmin ? store.charges.length : 0,
    webhooks: isAdmin ? store.webhooks.length : 0,
    descriptors: [] as string[],
    recentPayments: recentPayments(store.payments),
    activity: isAdmin ? store.activity.slice(0, 12) : [],
    payoutUrl: isAdmin ? "https://cp.listopays.com/" : "",
    balances: isAdmin
      ? {
          currency: "EUR",
          available: 0,
          hold: 0,
          incoming: 0,
          pendingPayout: 0,
        }
      : null,
  };

  try {
    const [descriptors, customers] = await Promise.all([
      getDescriptor(),
      listCustomers(),
    ]);
    return NextResponse.json({
      ...base,
      connected: true,
      customers: customers.length,
      descriptors,
    });
  } catch (error) {
    return NextResponse.json({
      ...base,
      connected: false,
      error: error instanceof Error ? error.message : "Could not connect",
    });
  }
}
