"use client";

import { useState, type FormEvent } from "react";
import { BrandMark } from "@/components/brand-mark";
import { SHARED_OFFER } from "@/lib/offer";

export default function SharedPayPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: SHARED_OFFER.currency,
  }).format(SHARED_OFFER.amount);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { url: string };
      };
      if (!res.ok || !json.data?.url) {
        throw new Error(json.error || "Could not start checkout");
      }
      window.location.assign(json.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setPending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-center px-5 py-10">
        <div className="mb-8">
          <BrandMark lockup />
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-ink shadow-[var(--shadow)]">
          <div className="px-7 py-7 text-paper">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
              Amount due
            </p>
            <p className="mt-3 text-[40px] font-semibold leading-none tracking-[-0.05em]">
              {amount}
            </p>
            <p className="mt-3 text-[13.5px] leading-6 text-paper/60">
              Enter your details to open a private payment page.
            </p>
          </div>

          <div className="rounded-t-[1.75rem] bg-panel px-7 py-7 text-ink">
            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-2xl bg-warn-soft px-3 py-2 text-[13px] text-warn"
              >
                {error}
              </p>
            ) : null}

            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="name" className="text-[12px] font-medium">
                  Full name
                </label>
                <input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-panel px-3.5 text-[14px] text-ink"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-[12px] font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-panel px-3.5 text-[14px] text-ink"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 text-[14px] font-semibold text-paper transition-colors duration-200 hover:bg-ink/90 disabled:opacity-50"
              >
                {pending ? "Opening checkout..." : `Pay ${amount}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
