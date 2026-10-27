"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Banner,
  Button,
  CopyButton,
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
import {
  CURRENCIES,
  type Customer,
  type PaymentRecord,
  type PublicUser,
} from "@/lib/types";

export default function PaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existing, setExisting] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [order, setOrder] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [pending, setPending] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ href: string; text: string }[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "user">("user");

  async function load() {
    const [c, p, me] = await Promise.all([
      api<{ data: Customer[] }>("/api/customers"),
      api<{ data: PaymentRecord[] }>("/api/payments"),
      api<{ data: PublicUser }>("/api/auth/me").catch(() => null),
    ]);
    const list = p.data ?? [];
    setCustomers(c.data ?? []);
    setPayments(list);
    if (me?.data?.role) setRole(me.data.role);
    return list;
  }

  useEffect(() => {
    let timer = 0;
    let stopped = false;

    async function refresh(initial = false) {
      try {
        const list = await load();
        if (stopped) return;
        const hasPending = list.some((item) => item.status === "pending");
        timer = window.setTimeout(() => void refresh(), hasPending ? 4000 : 20000);
      } catch (error) {
        if (initial) setMessage({ ok: false, text: (error as Error).message });
        if (!stopped) timer = window.setTimeout(() => void refresh(), 15000);
      }
    }

    void refresh(true);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  function pickCustomer(uuid: string) {
    setExisting(uuid);
    const selected = customers.find((c) => c.uuid === uuid);
    if (selected) {
      setCustomerName(selected.name);
      setCustomerEmail(selected.email);
    }
  }

  function switchMode(next: "new" | "existing") {
    setMode(next);
    setExisting("");
    if (next === "new") {
      setCustomerName("");
      setCustomerEmail("");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = [];
    if (!customerName.trim())
      next.push({ href: "#customerName", text: "Customer name is required" });
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      next.push({ href: "#customerEmail", text: "A valid email is required" });
    if (!order.trim()) next.push({ href: "#order", text: "Order note is required" });
    if (!amount || Number(amount) <= 0)
      next.push({ href: "#amount", text: "Enter an amount greater than zero" });
    setErrors(next);
    if (next.length) {
      document.getElementById("pay-errors")?.focus();
      return;
    }
    setPending(true);
    setMessage(null);
    setCreatedUrl(null);
    try {
      const res = await api<{ data: PaymentRecord }>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          customerName,
          customerEmail,
          order,
          amount: Number(amount),
          currency,
        }),
      });
      setCreatedUrl(res.data.url);
      setExisting("");
      if (mode === "new") {
        setCustomerName("");
        setCustomerEmail("");
      }
      setOrder("");
      setAmount("");
      setMessage({
        ok: true,
        text: "Payment link created. Send it to the customer.",
      });
      await load();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not create payment",
      });
    } finally {
      setPending(false);
    }
  }

  async function refund(token: string) {
    setRefunding(token);
    try {
      await api("/api/refund", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setMessage({ ok: true, text: "Refund requested." });
      await load();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Refund failed",
      });
    } finally {
      setRefunding(null);
    }
  }

  return (
    <div>
      <PageIntro
        kicker="Workspace"
        title="Payments"
        description="Create a checkout link. New emails are registered automatically."
      />

      {message ? (
        <div className="mb-6">
          <Banner tone={message.ok ? "ok" : "warn"} title={message.text}>
            {createdUrl ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={createdUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[13px] underline underline-offset-4"
                >
                  {createdUrl}
                </a>
                <CopyButton value={createdUrl} />
              </div>
            ) : null}
          </Banner>
        </div>
      ) : null}

      <SplitDesk
        form={
          <CreateCard kicker="New checkout" title="Create payment link">
            <form onSubmit={onSubmit} className="grid gap-4">
            <ErrorSummary id="pay-errors" errors={errors} />

            {customers.length > 0 ? (
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-gold-soft p-1">
                <button
                  type="button"
                  onClick={() => switchMode("new")}
                  className={`min-h-10 rounded-lg text-[13px] font-semibold ${
                    mode === "new" ? "bg-panel text-ink shadow-sm" : "text-ink-soft"
                  }`}
                >
                  New customer
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("existing")}
                  className={`min-h-10 rounded-lg text-[13px] font-semibold ${
                    mode === "existing"
                      ? "bg-panel text-ink shadow-sm"
                      : "text-ink-soft"
                  }`}
                >
                  Existing
                </button>
              </div>
            ) : null}

            {mode === "existing" ? (
              <Field id="existing" label="Customer">
                <Select
                  id="existing"
                  value={existing}
                  onChange={(e) => pickCustomer(e.target.value)}
                >
                  <option value="">Select a customer</option>
                  {customers.map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field
              id="customerName"
              label="Customer name"
              error={errors.find((e) => e.href === "#customerName")?.text}
            >
              <Input
                id="customerName"
                autoComplete="name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setExisting("");
                }}
                invalid={errors.some((e) => e.href === "#customerName")}
              />
            </Field>
            <Field
              id="customerEmail"
              label="Customer email"
              error={errors.find((e) => e.href === "#customerEmail")?.text}
            >
              <Input
                id="customerEmail"
                type="email"
                autoComplete="email"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  setExisting("");
                }}
                invalid={errors.some((e) => e.href === "#customerEmail")}
              />
            </Field>
            <Field
              id="order"
              label="Order note"
              error={errors.find((e) => e.href === "#order")?.text}
            >
              <Input
                id="order"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                invalid={errors.some((e) => e.href === "#order")}
              />
            </Field>
            <div className="grid grid-cols-[1fr_7.5rem] gap-3">
              <Field
                id="amount"
                label="Amount"
                error={errors.find((e) => e.href === "#amount")?.text}
              >
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  invalid={errors.some((e) => e.href === "#amount")}
                />
              </Field>
              <Field id="currency" label="Currency">
                <Select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" pending={pending} disabled={pending}>
              Create payment link
            </Button>
            </form>
          </CreateCard>
        }
      >
        <ListPane
          title="Payment links"
          meta={`${payments.length} ${payments.length === 1 ? "link" : "links"}`}
        >
          {payments.length === 0 ? (
            <Empty
              title="No payment links yet"
              body="Fill in the payer on the left. The checkout link will appear here so you can copy and send it."
            />
          ) : (
            <ul className="overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusPill status={p.status} />
                      <span className="text-[15px] font-semibold tracking-[-0.01em]">
                        <Money amount={p.amount} currency={p.currency} />
                      </span>
                      <When value={p.createdAt} />
                    </div>
                    <p className="mt-1.5 truncate text-[13px]">
                      <span className="font-medium">
                        {p.customerName ?? p.customer}
                      </span>
                      <span className="text-ink-soft"> · {p.order}</span>
                    </p>
                    {p.customerEmail ? (
                      <p className="truncate text-[12px] text-ink-soft">
                        {p.customerEmail}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-medium underline underline-offset-4"
                    >
                      Open
                    </a>
                    <CopyButton value={p.url} />
                    {p.status === "success" ? (
                      <Button
                        type="button"
                        tone="ghost"
                        className="min-h-9! px-3.5! text-[12.5px]!"
                        disabled={refunding === p.token}
                        pending={refunding === p.token}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Refund ${p.amount} ${p.currency} for "${p.order}"?`,
                            )
                          )
                            void refund(p.token);
                        }}
                      >
                        Refund
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ListPane>
      </SplitDesk>
    </div>
  );
}
