"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Banner,
  Button,
  CreateCard,
  Empty,
  ErrorSummary,
  Field,
  Input,
  ListPane,
  Money,
  PageIntro,
  Select,
  SplitDesk,
  StatusPill,
  When,
} from "@/components/ui";
import { api } from "@/lib/client";
import type { ChargeRecord, Customer } from "@/lib/types";

export default function ChargesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [charges, setCharges] = useState<ChargeRecord[]>([]);
  const [customer, setCustomer] = useState("");
  const [order, setOrder] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ href: string; text: string }[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function load() {
    const [c, ch] = await Promise.all([
      api<{ data: Customer[] }>("/api/customers"),
      api<{ data: ChargeRecord[] }>("/api/charge"),
    ]);
    setCustomers(c.data ?? []);
    setCharges(ch.data ?? []);
  }

  useEffect(() => {
    load().catch((error: Error) =>
      setMessage({ ok: false, text: error.message }),
    );
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = [];
    if (!customer) next.push({ href: "#customer", text: "Select a customer" });
    if (!order.trim()) next.push({ href: "#order", text: "Order note is required" });
    if (!amount || Number(amount) <= 0)
      next.push({ href: "#amount", text: "Enter an amount greater than zero" });
    setErrors(next);
    if (next.length) {
      document.getElementById("charge-errors")?.focus();
      return;
    }
    const selected = customers.find((c) => c.uuid === customer);
    setPending(true);
    setMessage(null);
    try {
      await api("/api/charge", {
        method: "POST",
        body: JSON.stringify({
          customer,
          customerName: selected?.name,
          order,
          amount: Number(amount),
        }),
      });
      setOrder("");
      setAmount("");
      setMessage({
        ok: true,
        text: "Charge sent. The customer must have paid once before.",
      });
      await load();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Charge failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageIntro
        kicker="Money"
        title="Charges"
        description="Charge a customer who has already completed a checkout."
      />
      {message ? (
        <div className="mb-6">
          <Banner tone={message.ok ? "ok" : "warn"} title={message.text} />
        </div>
      ) : null}

      <SplitDesk
        form={
          <CreateCard kicker="Collect" title="Charge customer">
            <form onSubmit={onSubmit} className="grid gap-4">
              <ErrorSummary id="charge-errors" errors={errors} />
              <Field id="customer" label="Customer">
                <Select
                  id="customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="order" label="Order note">
                <Input
                  id="order"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                />
              </Field>
              <Field id="amount" label="Amount">
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Button type="submit" pending={pending} disabled={pending}>
                Charge
              </Button>
            </form>
          </CreateCard>
        }
      >
        <ListPane
          title="History"
          meta={`${charges.length} ${charges.length === 1 ? "charge" : "charges"}`}
        >
          {charges.length === 0 ? (
            <Empty
              title="No charges yet"
              body="Successful and failed charges will appear here."
            />
          ) : (
            <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-5 py-3.5">
                        <StatusPill status={c.success ? "success" : "failed"} />
                        {c.error ? (
                          <p className="mt-1 text-[12px] text-warn">{c.error}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <Money amount={c.amount} currency={c.currency ?? "EUR"} />
                      </td>
                      <td className="px-5 py-3.5">{c.customerName ?? c.customer}</td>
                      <td className="px-5 py-3.5">{c.order}</td>
                      <td className="px-5 py-3.5">
                        <When value={c.createdAt} />
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
