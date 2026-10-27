import type {
  Currency,
  PaymentRecord,
  PaymentStatus,
  StoreData,
} from "./types";

export type ReportRange = "7d" | "30d" | "90d" | "all";

export type MoneyBucket = {
  currency: Currency;
  amount: number;
};

export type StatusCount = {
  status: PaymentStatus;
  count: number;
};

export type DayPoint = {
  date: string;
  label: string;
  paid: number;
  pending: number;
  refunded: number;
  failed: number;
};

export type CustomerRow = {
  name: string;
  email: string;
  payments: number;
  totals: MoneyBucket[];
};

export type ReportPayment = {
  id: string;
  order: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReportData = {
  range: ReportRange;
  from: string;
  to: string;
  payments: number;
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
  failedCount: number;
  collected: MoneyBucket[];
  pending: MoneyBucket[];
  refunded: MoneyBucket[];
  byStatus: StatusCount[];
  days: DayPoint[];
  customers: CustomerRow[];
  rows: ReportPayment[];
  charges: number;
  refunds: number;
};

const DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date) {
  return new Date(startOfUtcDay(date).getTime() + DAY - 1);
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMoney(list: MoneyBucket[], currency: Currency, amount: number) {
  const next = list.find((item) => item.currency === currency);
  if (next) next.amount += amount;
  else list.push({ currency, amount });
}

function inRange(iso: string, from: Date, to: Date) {
  const time = new Date(iso).getTime();
  return time >= from.getTime() && time <= to.getTime();
}

export function resolveReportRange(range: string | null): {
  range: ReportRange;
  from: Date;
  to: Date;
} {
  const preset: ReportRange =
    range === "7d" || range === "90d" || range === "all" ? range : "30d";
  const to = endOfUtcDay(new Date());
  if (preset === "all") {
    return { range: preset, from: new Date(0), to };
  }
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = startOfUtcDay(new Date(to.getTime() - (days - 1) * DAY));
  return { range: preset, from, to };
}

export function buildReport(store: StoreData, range: string | null): ReportData {
  const window = resolveReportRange(range);
  const payments = store.payments.filter((item) =>
    inRange(item.updatedAt || item.createdAt, window.from, window.to),
  );
  const collected: MoneyBucket[] = [];
  const pending: MoneyBucket[] = [];
  const refunded: MoneyBucket[] = [];
  const statusCount: Record<PaymentStatus, number> = {
    pending: 0,
    success: 0,
    refunded: 0,
    failed: 0,
  };

  for (const payment of payments) {
    statusCount[payment.status] += 1;
    if (payment.status === "success") addMoney(collected, payment.currency, payment.amount);
    if (payment.status === "pending") addMoney(pending, payment.currency, payment.amount);
    if (payment.status === "refunded") addMoney(refunded, payment.currency, payment.amount);
  }

  const dayCount = Math.min(
    90,
    Math.max(1, Math.round((window.to.getTime() - window.from.getTime()) / DAY) + 1),
  );
  const days: DayPoint[] = [];
  const start = startOfUtcDay(
    window.range === "all"
      ? new Date(window.to.getTime() - 29 * DAY)
      : window.from,
  );
  const span = window.range === "all" ? 30 : dayCount;
  for (let i = 0; i < span; i += 1) {
    const date = new Date(start.getTime() + i * DAY);
    const key = isoDay(date);
    const bucket = payments.filter((item) =>
      isoDay(new Date(item.updatedAt || item.createdAt)) === key,
    );
    days.push({
      date: key,
      label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      paid: bucket.filter((item) => item.status === "success").length,
      pending: bucket.filter((item) => item.status === "pending").length,
      refunded: bucket.filter((item) => item.status === "refunded").length,
      failed: bucket.filter((item) => item.status === "failed").length,
    });
  }

  const customerMap = new Map<string, CustomerRow>();
  for (const payment of payments.filter((item) => item.status === "success")) {
    const key = (payment.customerEmail || payment.customer || payment.id).toLowerCase();
    const current = customerMap.get(key) ?? {
      name: payment.customerName || "Customer",
      email: payment.customerEmail || "",
      payments: 0,
      totals: [],
    };
    current.payments += 1;
    addMoney(current.totals, payment.currency, payment.amount);
    customerMap.set(key, current);
  }

  const charges = store.charges.filter((item) => inRange(item.createdAt, window.from, window.to));
  const refunds = store.refunds.filter((item) => inRange(item.createdAt, window.from, window.to));

  return {
    range: window.range,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    payments: payments.length,
    paidCount: statusCount.success,
    pendingCount: statusCount.pending,
    refundedCount: statusCount.refunded,
    failedCount: statusCount.failed,
    collected,
    pending,
    refunded,
    byStatus: (Object.keys(statusCount) as PaymentStatus[]).map((status) => ({
      status,
      count: statusCount[status],
    })),
    days,
    customers: [...customerMap.values()]
      .sort((a, b) => b.payments - a.payments)
      .slice(0, 8),
    rows: payments
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(toReportPayment),
    charges: charges.length,
    refunds: refunds.filter((item) => item.success).length,
  };
}

function toReportPayment(payment: PaymentRecord): ReportPayment {
  return {
    id: payment.id,
    order: payment.order,
    customerName: payment.customerName || "Customer",
    customerEmail: payment.customerEmail || "",
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function reportCsv(rows: ReportPayment[]) {
  const header = [
    "Order",
    "Customer",
    "Email",
    "Amount",
    "Currency",
    "Status",
    "Created",
    "Updated",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csv(row.order),
        csv(row.customerName),
        csv(row.customerEmail),
        row.amount,
        row.currency,
        row.status === "success" ? "paid" : row.status,
        csv(row.createdAt),
        csv(row.updatedAt),
      ].join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csv(value: string) {
  const next = value.replaceAll('"', '""');
  return /[",\n]/.test(next) ? `"${next}"` : next;
}
