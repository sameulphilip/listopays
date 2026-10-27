"use client";

import { useEffect, useState } from "react";
import {
  Banner,
  CopyButton,
  Empty,
  PageIntro,
  StatusPill,
  When,
} from "@/components/ui";
import { api } from "@/lib/client";
import type { WebhookEvent } from "@/lib/types";

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    api<{ data: WebhookEvent[] }>("/api/webhook")
      .then((res) => setEvents(res.data ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  const url = origin ? `${origin}/api/webhook` : "/api/webhook";

  return (
    <div>
      <PageIntro
        kicker="Account"
        title="Updates"
        description="Paid checkouts appear here automatically. Copy the address only if you need to reconnect updates."
      />
      <div className="mb-8 overflow-hidden rounded-[1.75rem] bg-ink text-paper shadow-[var(--shadow)]">
        <div className="px-7 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
            Address
          </p>
          <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em]">
            Payment updates
          </p>
        </div>
        <div className="rounded-t-[1.75rem] bg-panel px-7 py-6 text-ink">
          <p className="break-all text-[13px]">{url}</p>
          <div className="mt-3">
            <CopyButton value={url} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <Banner tone="warn" title={error} />
        </div>
      ) : null}

      {events.length === 0 ? (
        <Empty
          title="No updates yet"
          body="When a customer pays, the confirmation appears here."
        />
      ) : (
        <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="text-ink-soft">
              <tr>
                <th className="px-5 py-3">Confirmed</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Received</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-line">
                  <td className="px-5 py-3.5">
                    <StatusPill status={e.valid ? "success" : "failed"} />
                  </td>
                  <td className="px-5 py-3.5">{e.status ?? "—"}</td>
                  <td className="px-5 py-3.5">{e.orderId ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <When value={e.receivedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
