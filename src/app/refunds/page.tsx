"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Banner,
  Button,
  CreateCard,
  Empty,
  Field,
  ListPane,
  PageIntro,
  Select,
  SplitDesk,
  StatusPill,
  When,
} from "@/components/ui";
import { api } from "@/lib/client";
import type { PaymentRecord, RefundRecord } from "@/lib/types";

export default function RefundsPage() {
  const [paymentId, setPaymentId] = useState("");
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function load() {
    const [refundRes, paymentRes] = await Promise.all([
      api<{ data: RefundRecord[] }>("/api/refund"),
      api<{ data: PaymentRecord[] }>("/api/payments"),
    ]);
    setRefunds(refundRes.data ?? []);
    setPayments(paymentRes.data ?? []);
  }

  useEffect(() => {
    load().catch((err: Error) => setMessage({ ok: false, text: err.message }));
  }, []);

  const refundable = payments.filter((p) => p.status === "success");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = refundable.find((p) => p.id === paymentId);
    if (!selected) {
      setError("Select a paid checkout");
      return;
    }
    setError("");
    setPending(true);
    setMessage(null);
    try {
      await api("/api/refund", {
        method: "POST",
        body: JSON.stringify({ token: selected.token }),
      });
      setPaymentId("");
      setMessage({ ok: true, text: "Refund sent." });
      await load();
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Refund failed",
      });
    } finally {
      setPending(false);
    }
  }

  function paymentLabel(token: string) {
    const match = payments.find((p) => p.token === token);
    if (!match) return "Payment";
    return match.order;
  }

  return (
    <div>
      <PageIntro
        kicker="Money"
        title="Refunds"
        description="Return a paid checkout. You can also refund from the Payments table."
      />
      {message ? (
        <div className="mb-6">
          <Banner tone={message.ok ? "ok" : "warn"} title={message.text} />
        </div>
      ) : null}

      <SplitDesk
        form={
          <CreateCard kicker="Return" title="Refund a payment">
            <form onSubmit={onSubmit} className="grid gap-4">
              <Field id="payment" label="Paid checkout" error={error}>
                <Select
                  id="payment"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  invalid={Boolean(error)}
                >
                  <option value="">Select a payment</option>
                  {refundable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.order} — {p.customerName ?? p.customer}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                type="submit"
                tone="danger"
                pending={pending}
                disabled={pending}
              >
                Refund
              </Button>
            </form>
          </CreateCard>
        }
      >
        <ListPane
          title="History"
          meta={`${refunds.length} ${refunds.length === 1 ? "refund" : "refunds"}`}
        >
          {refunds.length === 0 ? (
            <Empty
              title="No refunds yet"
              body="Paid checkouts can be refunded from here or from Payments."
            />
          ) : (
            <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-5 py-3.5">
                        <StatusPill status={r.success ? "refunded" : "failed"} />
                        {r.error ? (
                          <p className="mt-1 text-[12px] text-warn">{r.error}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">{paymentLabel(r.token)}</td>
                      <td className="px-5 py-3.5">
                        <When value={r.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ListPane>
      </SplitDesk>
    </div>
  );
}
