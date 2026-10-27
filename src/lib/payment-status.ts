import { randomUUID } from "crypto";
import { GATEWAY_ORIGIN } from "./checkout";
import { logActivity, mutateStore, readStore } from "./store";
import type { PaymentRecord, PaymentStatus, StoreData } from "./types";

export function normalizePaymentStatus(
  raw?: string | null,
): PaymentStatus | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (
    ["success", "paid", "completed", "complete", "successful", "succeeded"].includes(
      value,
    )
  ) {
    return "success";
  }
  if (["refunded", "refund", "reversed", "chargeback"].includes(value))
    return "refunded";
  if (
    [
      "failed",
      "fail",
      "failure",
      "error",
      "rejected",
      "declined",
      "cancelled",
      "canceled",
      "cancel",
      "expired",
    ].includes(value)
  ) {
    return "failed";
  }
  if (["pending", "processing", "open"].includes(value)) return "pending";
  return null;
}

function isSuccessPath(value: string) {
  return /\/success\/?(\?|#|$)/i.test(value);
}

function isFailedPath(value: string) {
  return /\/(fail|failed|failure|error|declined|rejected|cancel|cancelled|canceled|expired)\/?(\?|#|$)/i.test(
    value,
  );
}

function isRefundedPath(value: string) {
  return /\/(refund|refunded|reversed)\/?(\?|#|$)/i.test(value);
}

export type GatewayState = "success" | "failed" | "refunded" | null;

export function stateFromPath(value: string): GatewayState {
  if (isRefundedPath(value)) return "refunded";
  if (isSuccessPath(value)) return "success";
  if (isFailedPath(value)) return "failed";
  return null;
}

export async function gatewayCheckoutState(token: string): Promise<GatewayState> {
  const url = `${GATEWAY_ORIGIN}/payment/${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "text/html" },
    });
    const location = res.headers.get("location") ?? "";
    const finalUrl = res.url ?? "";
    const body = res.body as { cancel?: () => Promise<unknown> } | null;
    await body?.cancel?.().catch(() => undefined);
    return stateFromPath(finalUrl) ?? stateFromPath(location);
  } catch {
    return null;
  }
}

export async function gatewayCheckoutSucceeded(token: string) {
  return (await gatewayCheckoutState(token)) === "success";
}

let lastSyncAt = 0;

export function applyPaymentStatus(
  store: StoreData,
  match: { token?: string; orderId?: string },
  status: PaymentStatus,
) {
  const payment = store.payments.find((item) => {
    if (match.token && item.token === match.token) return true;
    if (match.orderId && item.order === match.orderId) return true;
    return false;
  });
  if (!payment || payment.status === status) return payment ?? null;
  if (payment.status === "refunded") return payment;
  if (status === "pending") return payment;
  payment.status = status;
  payment.updatedAt = new Date().toISOString();
  if (status === "refunded") {
    store.refunds.unshift({
      id: randomUUID(),
      token: payment.token,
      success: true,
      error: null,
      createdAt: payment.updatedAt,
    });
  }
  logActivity(store, {
    kind: "payment",
    title:
      status === "success"
        ? `Paid ${payment.amount} ${payment.currency}`
        : `Payment ${status}`,
    detail: payment.order,
  });
  return payment;
}

export async function markPaymentPaid(token: string, verifyGateway = true) {
  const state = verifyGateway ? await gatewayCheckoutState(token) : "success";
  if (!state) {
    return { confirmed: false as const, payment: null };
  }
  const payment = mutateStore((store) =>
    applyPaymentStatus(store, { token }, state),
  );
  return { confirmed: true as const, payment };
}

export async function syncPendingPayments() {
  const now = Date.now();
  if (now - lastSyncAt < 8000) return 0;
  lastSyncAt = now;
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const all = readStore().payments;
  // Pending links, recently failed ones (a customer may retry and pay),
  // then recent paid ones (they may have been refunded on the gateway).
  const open = [
    ...all.filter(
      (item) =>
        item.status === "pending" ||
        (item.status === "failed" && item.updatedAt >= dayAgo),
    ),
    ...all
      .filter((item) => item.status === "success" && item.updatedAt >= monthAgo)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  ].slice(0, 12);
  if (open.length === 0) return 0;
  const results = (
    await Promise.all(
      open.map(async (item) => {
        const state = await gatewayCheckoutState(item.token);
        return state && state !== item.status ? { token: item.token, state } : null;
      }),
    )
  ).filter(
    (r): r is { token: string; state: "success" | "failed" | "refunded" } =>
      Boolean(r),
  );
  if (results.length === 0) return 0;
  mutateStore((store) => {
    for (const { token, state } of results) {
      applyPaymentStatus(store, { token }, state);
    }
  });
  return results.length;
}

export function recentPayments(payments: PaymentRecord[]) {
  return [...payments]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);
}
