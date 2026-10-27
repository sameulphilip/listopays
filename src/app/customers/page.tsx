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
  PageIntro,
  SplitDesk,
} from "@/components/ui";
import { api } from "@/lib/client";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ href: string; text: string }[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function refresh() {
    setLoading(true);
    try {
      const res = await api<{ data: Customer[] }>("/api/customers");
      setCustomers(res.data ?? []);
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not load customers",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = [];
    if (!name.trim()) next.push({ href: "#name", text: "Name is required" });
    if (!email.trim()) next.push({ href: "#email", text: "Email is required" });
    setErrors(next);
    if (next.length) {
      document.getElementById("customer-errors")?.focus();
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      setName("");
      setEmail("");
      setMessage({ ok: true, text: "Customer saved." });
      await refresh();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save customer",
      });
    } finally {
      setPending(false);
    }
  }

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageIntro
        kicker="Workspace"
        title="Customers"
        description="Keep payer names and emails here. New emails are also created automatically from Payments."
      />

      {message ? (
        <div className="mb-6">
          <Banner tone={message.ok ? "ok" : "warn"} title={message.text} />
        </div>
      ) : null}

      <SplitDesk
        form={
          <CreateCard kicker="Directory" title="Add customer">
            <form onSubmit={onSubmit} className="grid gap-4">
              <ErrorSummary id="customer-errors" errors={errors} />
              <Field
                id="name"
                label="Name"
                error={errors.find((e) => e.href === "#name")?.text}
              >
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  invalid={errors.some((e) => e.href === "#name")}
                />
              </Field>
              <Field
                id="email"
                label="Email"
                error={errors.find((e) => e.href === "#email")?.text}
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  invalid={errors.some((e) => e.href === "#email")}
                />
              </Field>
              <Button type="submit" pending={pending} disabled={pending}>
                Save customer
              </Button>
            </form>
          </CreateCard>
        }
      >
        <ListPane
          title="People"
          meta={`${filtered.length} ${filtered.length === 1 ? "customer" : "customers"}`}
        >
          <div className="mb-4">
            <Input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search customers"
            />
          </div>
          {loading ? (
            <div className="h-32 animate-pulse rounded-[1.75rem] bg-panel" aria-busy="true" />
          ) : filtered.length === 0 ? (
            <Empty
              title="No customers yet"
              body="Add a name and email on the left, or create a payment link and they will appear here."
            />
          ) : (
            <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
              <table className="w-full min-w-[480px] text-[13px]">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.uuid} className="border-t border-line">
                      <td className="px-5 py-3.5 font-medium">{c.name}</td>
                      <td className="px-5 py-3.5">{c.email}</td>
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
