export const CURRENCIES = ["EUR", "USD", "GBP", "ISL"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Customer = {
  uuid: string;
  name: string;
  email: string;
};

export type PaymentStatus = "pending" | "success" | "refunded" | "failed";

export type PaymentRecord = {
  id: string;
  token: string;
  url: string;
  customer: string;
  customerName?: string;
  customerEmail?: string;
  order: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChargeRecord = {
  id: string;
  customer: string;
  customerName?: string;
  order: string;
  amount: number;
  currency?: Currency;
  success: boolean;
  error?: string | null;
  createdAt: string;
};

export type RefundRecord = {
  id: string;
  token: string;
  success: boolean;
  error?: string | null;
  createdAt: string;
};

export type WebhookEvent = {
  id: string;
  receivedAt: string;
  valid: boolean;
  transaction?: string;
  orderId?: string;
  status?: string;
  payload: unknown;
};

export type ActivityItem = {
  id: string;
  at: string;
  kind: "customer" | "payment" | "charge" | "refund" | "webhook" | "system";
  title: string;
  detail?: string;
};

export type Role = "admin" | "user";

export type ConsoleUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  createdAt: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

export type StoreData = {
  payments: PaymentRecord[];
  charges: ChargeRecord[];
  refunds: RefundRecord[];
  webhooks: WebhookEvent[];
  activity: ActivityItem[];
  users: ConsoleUser[];
};
