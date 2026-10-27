"use client";

import {
  ArrowCounterClockwise,
  ChartBar,
  CreditCard,
  GearSix,
  House,
  Lightning,
  List,
  SignOut,
  Users,
  UsersThree,
  WebhooksLogo,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { BRAND, roleLabel } from "@/lib/brand";
import type { PublicUser } from "@/lib/types";

const NAV = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: House, roles: ["admin", "user"] },
      { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "user"] },
      { href: "/payments", label: "Payments", icon: CreditCard, roles: ["admin", "user"] },
      { href: "/reports", label: "Reports", icon: ChartBar, roles: ["admin", "user"] },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/charges", label: "Charges", icon: Lightning, roles: ["admin"] },
      { href: "/refunds", label: "Refunds", icon: ArrowCounterClockwise, roles: ["admin", "user"] },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/webhooks", label: "Updates", icon: WebhooksLogo, roles: ["admin"] },
      { href: "/users", label: "Team", icon: UsersThree, roles: ["admin"] },
      { href: "/settings", label: "Settings", icon: GearSix, roles: ["admin"] },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isPublic =
    path.startsWith("/p/") ||
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/pay" ||
    path.startsWith("/pay/");
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<"live" | "offline" | "checking">("checking");
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    if (isPublic) return;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
      })
      .catch(() => setUser(null));
    fetch("/api/overview")
      .then((res) => res.json())
      .then((data) => {
        setLive(data.connected ? "live" : "offline");
      })
      .catch(() => setLive("offline"));
  }, [path, isPublic]);

  if (isPublic) {
    return <>{children}</>;
  }

  const role = user?.role ?? "user";
  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-ink lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 lg:hidden">
        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <img src="/brand/leez-mark.png" alt="" className="h-7 w-auto object-contain" />
          <p className="text-[14px] font-semibold tracking-tight">{BRAND.name}</p>
        </div>
        <LiveChip state={live} />
      </header>

      <aside
        className={`${open ? "block" : "hidden"} bg-sidebar text-sidebar-fg lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col`}
      >
        <div className="hidden px-5 py-7 lg:block">
          <BrandMark inverted subtitle={BRAND.tagline} />
        </div>
        <nav className="flex-1 px-3 pb-4" aria-label="Console">
          {groups.map((group) => (
            <div key={group.label} className="mb-7">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
                {group.label}
              </p>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? path === "/"
                      : path.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[13.5px] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        active
                          ? "bg-sidebar-fg text-sidebar font-medium"
                          : "text-sidebar-muted hover:bg-sidebar-fg/10 hover:text-sidebar-fg"
                      }`}
                    >
                      <Icon size={16} weight={active ? "fill" : "regular"} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-4 py-5">
          <div className="mb-4 hidden lg:block">
            <LiveChip state={live} dark />
          </div>
          {user ? (
            <div className="flex items-center gap-3 rounded-2xl bg-sidebar-fg/10 px-2.5 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-fg text-[12px] font-semibold text-sidebar">
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{user.name}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">
                  {roleLabel(user.role)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-sidebar-muted hover:bg-sidebar-fg/10 hover:text-sidebar-fg"
                aria-label="Sign out"
              >
                <SignOut size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="hidden h-16 items-center justify-between px-8 lg:flex">
          <p className="text-[13px] text-ink-soft">{BRAND.tagline}</p>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="rounded-full bg-ink/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {roleLabel(user.role)}
              </span>
            ) : null}
            <LiveChip state={live} />
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-12 pt-4 md:px-8 md:pt-2 md:pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LiveChip({
  state,
  dark,
}: {
  state: "live" | "offline" | "checking";
  dark?: boolean;
}) {
  const label =
    state === "live" ? "Live" : state === "offline" ? "Offline" : "Checking";
  const color =
    state === "live"
      ? "bg-[oklch(0.72_0.14_155)]"
      : state === "offline"
        ? "bg-[oklch(0.62_0.18_28)]"
        : "bg-[oklch(0.7_0.02_250)]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] ${
        dark ? "text-sidebar-muted" : "text-ink-soft"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}
