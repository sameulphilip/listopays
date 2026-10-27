"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banner,
  Button,
  Empty,
  ListPane,
  Money,
  PageIntro,
  StatusPill,
  When,
} from "@/components/ui";
import { api } from "@/lib/client";
import type { ReportData, ReportRange } from "@/lib/reports";

const RANGES: { id: ReportRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: ReportData }>(`/api/reports?range=${range}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setError("");
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const peak = useMemo(() => {
    if (!data?.days.length) return 1;
    return Math.max(1, ...data.days.map((day) => day.paid + day.pending + day.refunded + day.failed));
  }, [data]);

  async function downloadCsv() {
    const res = await fetch(`/api/reports?range=${range}&format=csv`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      setError("Could not export the report.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leez-pay-report-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageIntro
        kicker="Workspace"
        title="Reports"
        description="Collected volume, checkout outcomes, and customer activity for the selected period."
        action={
          <Button type="button" tone="ghost" onClick={downloadCsv} disabled={!data?.rows.length}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={`min-h-10 rounded-full px-4 text-[13px] font-medium transition-colors duration-200 ${
              range === item.id
                ? "bg-ink text-paper"
                : "border border-line bg-panel text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-6">
          <Banner tone="warn" title={error} />
        </div>
      ) : null}

      {loading && !data ? (
        <div className="h-40 animate-pulse rounded-[1.75rem] bg-panel" aria-busy="true" />
      ) : data ? (
        <>
          <section className="mb-8 overflow-hidden rounded-[1.75rem] bg-ink text-paper shadow-[var(--shadow)]">
            <div className="px-8 py-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
                Collected
              </p>
              {data.collected.length === 0 ? (
                <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">0.00</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-8">
                  {data.collected.map((item) => (
                    <p key={item.currency} className="text-[36px] font-semibold tracking-[-0.05em]">
                      <Money amount={item.amount} currency={item.currency} />
                    </p>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[13px] text-paper/55">
                {data.paidCount} paid · {data.payments} checkouts in this period
              </p>
            </div>
          </section>

          <section className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line md:grid-cols-4">
            <Stat label="Paid" value={String(data.paidCount)} />
            <Stat label="Pending" value={String(data.pendingCount)} />
            <Stat label="Refunded" value={String(data.refundedCount)} />
            <Stat label="Failed" value={String(data.failedCount)} />
          </section>
          {data.charges > 0 || data.refunds > 0 ? (
            <p className="mb-8 text-[13px] text-ink-soft">
              {data.charges} charges · {data.refunds} refunds in this period
            </p>
          ) : null}

          <div className="mb-10 grid gap-10 xl:grid-cols-[1.35fr_0.65fr]">
            <section>
              <h2 className="mb-4 text-[16px] font-semibold tracking-[-0.02em]">
                Daily activity
              </h2>
              {data.days.every((day) => day.paid + day.pending + day.refunded + day.failed === 0) ? (
                <Empty
                  title="No activity in this period"
                  body="Create checkout links from Payments. Paid checkouts will appear here."
                />
              ) : (
                <div className="overflow-hidden rounded-[1.75rem] border border-line bg-panel px-5 py-5 shadow-[var(--shadow)]">
                  <div className="flex h-40 items-end gap-1">
                    {data.days.map((day) => {
                      const total = day.paid + day.pending + day.refunded + day.failed;
                      const height = Math.max(total ? 8 : 3, Math.round((total / peak) * 140));
                      return (
                        <div
                          key={day.date}
                          className="flex min-w-0 flex-1 flex-col items-center justify-end"
                          title={`${day.label}: ${day.paid} paid`}
                        >
                          <div
                            className={`w-full max-w-4 rounded-t-md ${
                              day.paid ? "bg-ink" : "bg-line"
                            }`}
                            style={{ height }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] text-ink-soft">
                    <span>{data.days[0]?.label}</span>
                    <span>{data.days.at(-1)?.label}</span>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-[16px] font-semibold tracking-[-0.02em]">
                Top customers
              </h2>
              {data.customers.length === 0 ? (
                <Empty
                  title="No paid customers yet"
                  body="Successful checkouts will rank customers here."
                />
              ) : (
                <ol className="overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
                  {data.customers.map((customer) => (
                    <li
                      key={customer.email || customer.name}
                      className="flex items-start justify-between gap-3 border-t border-line px-5 py-4 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{customer.name}</p>
                        {customer.email ? (
                          <p className="truncate font-mono text-[12px] text-ink-soft">
                            {customer.email}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        {customer.totals.map((item) => (
                          <p key={item.currency} className="text-[13px] font-medium">
                            <Money amount={item.amount} currency={item.currency} />
                          </p>
                        ))}
                        <p className="text-[11px] text-ink-soft">
                          {customer.payments} paid
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {(data.pending.length > 0 || data.refunded.length > 0) && (
            <section className="mb-10 grid gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line sm:grid-cols-2">
              <MoneyStat label="Still pending" amounts={data.pending} />
              <MoneyStat label="Refunded" amounts={data.refunded} />
            </section>
          )}

          <ListPane title="Checkouts" meta={`${data.rows.length} in this period`}>
            {data.rows.length === 0 ? (
              <Empty
                title="No checkouts in this period"
                body="Try a wider date range, or create a new payment link."
              />
            ) : (
              <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead className="text-ink-soft">
                    <tr>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.slice(0, 50).map((row) => (
                      <tr key={row.id} className="border-t border-line">
                        <td className="px-5 py-3.5">
                          <StatusPill status={row.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <Money amount={row.amount} currency={row.currency} />
                        </td>
                        <td className="px-5 py-3.5">{row.order}</td>
                        <td className="px-5 py-3.5">
                          <p>{row.customerName}</p>
                          {row.customerEmail ? (
                            <p className="font-mono text-[12px] text-ink-soft">
                              {row.customerEmail}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3.5">
                          <When value={row.updatedAt} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ListPane>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1.5 text-[16px] font-semibold">{value}</p>
    </div>
  );
}

function MoneyStat({
  label,
  amounts,
}: {
  label: string;
  amounts: { amount: number; currency: string }[];
}) {
  return (
    <div className="bg-panel px-6 py-5">
      <p className="text-[12px] text-ink-soft">{label}</p>
      {amounts.length === 0 ? (
        <p className="mt-2 text-[18px] font-semibold">0.00</p>
      ) : (
        amounts.map((item) => (
          <p key={item.currency} className="mt-2 text-[18px] font-semibold tracking-[-0.03em]">
            <Money amount={item.amount} currency={item.currency} />
          </p>
        ))
      )}
    </div>
  );
}
