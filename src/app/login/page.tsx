"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Banner, Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        throw new Error(json.error || "Could not sign in");
      }
      router.replace(params.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col justify-center px-5 py-10">
        <div className="mb-8">
          <BrandMark lockup />
        </div>
        <div className="overflow-hidden rounded-[1.75rem] bg-ink shadow-[var(--shadow)]">
          <div className="px-7 py-7 text-paper">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
              Console
            </p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em]">
              Sign in
            </h1>
            <p className="mt-2 text-[13.5px] text-paper/60">
              Access payments, customers, and settlement operations.
            </p>
          </div>
          <div className="rounded-t-[1.75rem] bg-panel px-7 py-7 text-ink">
            {error ? (
              <div className="mb-4">
                <Banner tone="warn" title={error} />
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-[12px] font-medium">
                  Email or username
                </label>
                <Input
                  id="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="password" className="text-[12px] font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" pending={pending} disabled={pending}>
                Continue
              </Button>
            </form>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-ink-soft">Staff access only</p>
      </div>
    </div>
  );
}
