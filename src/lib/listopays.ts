import { timingSafeEqual } from "crypto";
import { BRAND, sanitizePublicError } from "@/lib/brand";
import type { Currency, Customer } from "./types";

const BASE = process.env.LISTOPAYS_BASE_URL ?? "https://api.listopays.com";

export function publicKey() {
  const key = process.env.LISTOPAYS_PUBLIC_KEY;
  if (!key) throw new Error("LISTOPAYS_PUBLIC_KEY is missing");
  return key;
}

export function privateKey() {
  return process.env.LISTOPAYS_PRIVATE_KEY ?? "";
}

export function maskedKey(value: string, keep = 4) {
  if (!value) return "Not set";
  if (value.length <= keep * 2) return "••••";
  return `${value.slice(0, keep)}••••${value.slice(-keep)}`;
}

type ApiEnvelope<T> = {
  success: boolean;
  error?: string | null;
  data?: T;
  descriptors?: string[];
};

async function request<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {},
): Promise<ApiEnvelope<T>> {
  const key = publicKey();
  const url = new URL(path, BASE.endsWith("/") ? BASE : `${BASE}/`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, v);
  }

  const { query: _query, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-PUBLIC-KEY": key,
      ...init.headers,
    },
    cache: "no-store",
  });

  let body: ApiEnvelope<T>;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Payment service returned a non-JSON response (${res.status})`);
  }

  if (!res.ok || body.success === false) {
    throw new Error(sanitizePublicError(body.error || `Payment request failed (${res.status})`));
  }
  return body;
}

export async function getDescriptor() {
  const res = await request<never>("descriptor", {
    method: "GET",
    query: { public_key: publicKey() },
  });
  return res.descriptors ?? [];
}

function normalizeCustomers(data: unknown): Customer[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    return Object.values(data as Record<string, Customer>).filter(
      (item) => item && typeof item === "object" && "uuid" in item,
    );
  }
  return [];
}

export async function listCustomers() {
  const res = await request<Customer[] | Record<string, Customer>>("customers", {
    method: "GET",
    query: { public_key: publicKey() },
  });
  return normalizeCustomers(res.data);
}

export async function createCustomer(input: { name: string; email: string }) {
  const res = await request<{ uuid: string }>("customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      public_key: publicKey(),
    }),
  });
  if (!res.data?.uuid) throw new Error("Customer could not be created");
  return res.data.uuid;
}

export async function findOrCreateCustomer(input: {
  name: string;
  email: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const existing = (await listCustomers()).find(
    (customer) => customer.email.toLowerCase() === email,
  );
  if (existing) {
    return { ...existing, created: false as const };
  }
  const uuid = await createCustomer({ name, email });
  return { uuid, name, email, created: true as const };
}

export async function createPayment(input: {
  customer: string;
  order: string;
  amount: number;
  currency?: Currency;
}) {
  const res = await request<{ url: string }>("payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      order: input.order,
      amount: input.amount,
      currency: input.currency,
      public_key: publicKey(),
    }),
  });
  if (!res.data?.url) throw new Error("Checkout link could not be created");
  return res.data.url;
}

export async function chargeCustomer(input: {
  customer: string;
  order: string;
  amount: number;
}) {
  await request<null>("charge", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      order: input.order,
      amount: input.amount,
      public_key: publicKey(),
    }),
  });
}

export async function refundPayment(token: string) {
  await request<null>(`payment/${encodeURIComponent(token)}/refund`, {
    method: "POST",
    body: JSON.stringify({ public_key: publicKey() }),
  });
}

export function tokenFromUrl(url: string) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? url;
  } catch {
    return url.split("/").filter(Boolean).at(-1) ?? url;
  }
}

export function verifyWebhookPrivateKey(incoming?: string) {
  const expected = privateKey();
  if (!expected || !incoming) return false;
  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function merchantName() {
  return BRAND.name;
}

export function connectionInfo() {
  return {
    baseUrl: BASE,
    publicKey: maskedKey(process.env.LISTOPAYS_PUBLIC_KEY ?? ""),
    privateKey: maskedKey(process.env.LISTOPAYS_PRIVATE_KEY ?? ""),
    domain: process.env.LISTOPAYS_DOMAIN || null,
    merchantName: merchantName(),
    hasPublicKey: Boolean(process.env.LISTOPAYS_PUBLIC_KEY),
    hasPrivateKey: Boolean(process.env.LISTOPAYS_PRIVATE_KEY),
  };
}
