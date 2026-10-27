"use client";

import { Check, Copy } from "@phosphor-icons/react";
import {
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[12px] text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-warn">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "h-11 w-full rounded-xl border border-line bg-panel px-3.5 text-[14px] text-ink placeholder:text-ink-soft/70 transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-ink";

export function Input(
  props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { className = "", invalid, ...rest } = props;
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${control} ${invalid ? "border-warn" : ""} ${className}`}
    />
  );
}

export function Select(
  props: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean },
) {
  const { className = "", invalid, children, ...rest } = props;
  return (
    <select
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${control} ${invalid ? "border-warn" : ""} ${className}`}
    >
      {children}
    </select>
  );
}

export function Button({
  children,
  tone = "primary",
  pending,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger";
  pending?: boolean;
}) {
  const tones = {
    primary:
      "bg-ink text-paper hover:bg-ink/90 active:scale-[0.98] disabled:bg-ink/40",
    ghost:
      "border border-line bg-panel text-ink hover:bg-gold-soft disabled:opacity-50",
    danger: "bg-warn text-paper hover:brightness-95 disabled:opacity-50",
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[13.5px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${tones[tone]} ${props.className ?? ""}`}
    >
      {pending ? "Working..." : children}
    </button>
  );
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: "ok" | "warn" | "info";
  title: string;
  children?: ReactNode;
}) {
  const map = {
    ok: "bg-gold-soft text-ink",
    warn: "bg-warn-soft text-warn",
    info: "border border-line bg-panel text-ink",
  };
  return (
    <div
      role={tone === "warn" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3.5 text-[13px] ${map[tone]}`}
    >
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1 opacity-90">{children}</div> : null}
    </div>
  );
}

export function PageHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <PageIntro title={title} description={description} action={action} />
  );
}

export function PageIntro({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            {kicker}
          </p>
        ) : null}
        <h1
          className={`${kicker ? "mt-2" : ""} text-[32px] font-semibold leading-tight tracking-[-0.045em]`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[58ch] text-[14px] leading-6 text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function SplitDesk({
  form,
  children,
}: {
  form: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      {form}
      {children}
    </div>
  );
}

export function CreateCard({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-ink text-paper shadow-[var(--shadow)]">
      <div className="px-7 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
          {kicker}
        </p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em]">
          {title}
        </h2>
      </div>
      <div className="rounded-t-[1.75rem] bg-panel px-7 py-7 text-ink">
        {children}
      </div>
    </section>
  );
}

export function ListPane({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">{title}</h2>
        {meta ? <p className="text-[12px] text-ink-soft">{meta}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-[14px] font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.75rem] border border-line bg-panel px-6 py-14 text-center">
      <p className="text-[15px] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] leading-6 text-ink-soft">
        {body}
      </p>
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex min-h-8 items-center gap-1 text-[12px] font-medium text-ink-soft hover:text-ink"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-pending-soft text-[oklch(0.42_0.08_75)]",
    success: "bg-ink text-paper",
    refunded: "bg-[#ede9fe] text-[#6d28d9] ring-1 ring-inset ring-[#c4b5fd]",
    failed: "bg-[#fee2e2] text-[#b91c1c] ring-1 ring-inset ring-[#fca5a5]",
    live: "bg-ink text-paper",
    offline: "bg-warn-soft text-warn",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    success: "Paid",
    refunded: "Refunded",
    failed: "Failed",
    live: "Live",
    offline: "Offline",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] ${map[status] ?? "bg-gold-soft text-ink"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function Money({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency === "ISL" ? "ILS" : currency,
    maximumFractionDigits: 2,
  }).format(amount);
  return <span className="font-mono tabular-nums">{formatted}</span>;
}

export function When({ value }: { value: string }) {
  const d = new Date(value);
  return (
    <time dateTime={value} className="font-mono text-[12px] text-ink-soft">
      {d.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    </time>
  );
}

export function ErrorSummary({
  id,
  errors,
}: {
  id: string;
  errors: { href: string; text: string }[];
}) {
  if (!errors.length) return null;
  return (
    <div
      id={id}
      role="alert"
      tabIndex={-1}
      className="rounded-2xl bg-warn-soft px-4 py-3.5 text-[13px] text-warn"
    >
      <p className="font-medium">There is a problem</p>
      <ul className="mt-2 grid gap-1">
        {errors.map((e) => (
          <li key={e.href}>
            <a href={e.href} className="underline underline-offset-2">
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FormGrid({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      {children}
    </form>
  );
}
