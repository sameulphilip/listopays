"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Banner,
  Empty,
  Money,
  PageIntro,
  StatusPill,
  When,
} from "@/components/ui";
import { api } from "@/lib/client";
import { BRAND } from "@/lib/brand";
import type { ActivityItem, PaymentRecord, PublicUser } from "@/lib/types";

type Balances = {
  currency: string;
  available: number;
  hold: number;
  incoming: number;
  pendingPayout: number;
};

type Overview = {
  connected: boolean;
  error?: string;
  merchantName: string;
  payoutUrl: string;
  balances: Balances | null;
  descriptors: string[];
  customers: number;
  payments: number;
  pending: number;
  succeeded: number;
  refunded: number;
  charges: number;
  webhooks: number;
  activity: ActivityItem[];
  recentPayments: PaymentRecord[];
};

const EMPTY: Overview = {
  connected: false,
  merchantName: BRAND.legalName,
  payoutUrl: "",
  balances: null,
  descriptors: [],
  customers: 0,
  payments: 0,
  pending: 0,
  succeeded: 0,
  refunded: 0,
  charges: 0,
  webhooks: 0,
  activity: [],
  recentPayments: [],
};

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [role, setRole] = useState<"admin" | "user">("user");

  useEffect(() => {
    let timer = 0;
    let stopped = false;

    api<{ data: PublicUser }>("/api/auth/me")
      .then((me) => {
        if (!stopped && me?.data?.role === "admin") setRole("admin");
      })
      .catch(() => undefined);

    async function refresh() {
      try {
        const res = await api<Overview>("/api/overview");
        if (stopped) return;
        setData({ ...EMPTY, ...res });
        timer = window.setTimeout(refresh, res.pending > 0 ? 4000 : 20000);
      } catch (error) {
        if (stopped) return;
        setData((current) => current ?? { ...EMPTY, error: (error as Error).message });
        timer = window.setTimeout(refresh, 15000);
      }
    }

    void refresh();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!data) {
    return <div className="h-40 animate-pulse rounded-xl bg-panel" aria-busy="true" />;
  }

  return (
    <div>
      <PageIntro
        kicker="Overview"
        title="Welcome back"
        description={data.merchantName}
        action={
          role === "admin" && data.payoutUrl ? (
            <a
              href={data.payoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl bg-ink px-5 text-[13.5px] font-semibold text-paper transition-colors duration-200 hover:bg-ink/90"
            >
              Request Payout
            </a>
          ) : undefined
        }
      />

      {!data.connected ? (
        <div className="mb-6">
          <Banner tone="warn" title="Could not reach the payment service">
            {data.error}
          </Banner>
        </div>
      ) : null}

      {role === "admin" && data.balances ? (
        <section className="mb-8 overflow-hidden rounded-[1.75rem] bg-ink text-paper shadow-[var(--shadow)]">
          <div className="flex flex-col items-start gap-1.5 px-8 py-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
              Available for withdrawal
            </p>
            <p className="text-[44px] font-semibold tracking-[-0.06em]">
              {euro(data.balances.available, data.balances.currency)}
            </p>
            <p className="text-[13px] text-paper/55">Ready to be paid out</p>
          </div>
          <div className="grid rounded-t-[1.75rem] bg-panel text-ink sm:grid-cols-3">
            <MiniBalance
              label="Hold"
              hint="Temporarily held"
              amount={data.balances.hold}
              currency={data.balances.currency}
            />
            <MiniBalance
              label="Incoming"
              hint="On the way"
              amount={data.balances.incoming}
              currency={data.balances.currency}
            />
            <MiniBalance
              label="Pending payout"
              hint="In progress"
              amount={data.balances.pendingPayout}
              currency={data.balances.currency}
              last
            />
          </div>
        </section>
      ) : null}

      <section
        className={`mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line ${
          role === "admin" ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-4"
        }`}
      >
        <Stat label="Customers" value={String(data.customers)} />
        <Stat label="Pending" value={String(data.pending)} />
        <Stat label="Paid" value={String(data.succeeded)} />
        <Stat label="Refunded" value={String(data.refunded)} />
        {role === "admin" ? (
          <Stat label="Charges" value={String(data.charges)} />
        ) : null}
      </section>

      <div
        className={`grid gap-10 ${role === "admin" ? "xl:grid-cols-[1.3fr_0.7fr]" : ""}`}
      >
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
              Recent payments
            </h2>
            <Link
              href="/payments"
              className="text-[13px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Open payments
            </Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <Empty
              title="No payment links yet"
              body="Create a checkout link from Payments, then send it to the customer."
            />
          ) : (
            <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-5 py-3.5">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Money amount={p.amount} currency={p.currency} />
                      </td>
                      <td className="px-5 py-3.5">{p.order}</td>
                      <td className="px-5 py-3.5">
                        <When value={p.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {role === "admin" ? (
          <section>
            <h2 className="mb-4 text-[16px] font-semibold tracking-[-0.02em]">
              Activity
            </h2>
            {data.activity.length === 0 ? (
              <Empty
                title="No activity"
                body="Customers, payment links, charges, refunds, and webhooks appear here."
              />
            ) : (
              <ol className="grid gap-0">
                {data.activity.map((item) => (
                  <li key={item.id} className="border-t border-line py-3">
                    <p className="text-[13.5px] font-medium">{item.title}</p>
                    {item.detail ? (
                      <p className="font-mono text-[12px] text-ink-soft">
                        {item.detail}
                      </p>
                    ) : null}
                    <When value={item.at} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function euro(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function MiniBalance({
  label,
  hint,
  amount,
  currency,
  last,
}: {
  label: string;
  hint: string;
  amount: number;
  currency: string;
  last?: boolean;
}) {
  return (
    <div className={`px-6 py-5 ${last ? "" : "border-b border-line sm:border-b-0 sm:border-r"}`}>
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em]">
        {euro(amount, currency)}
      </p>
      <p className="mt-1 text-[12px] text-ink-soft">{hint}</p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-panel px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold">{value}</p>
    </div>
  );
}
