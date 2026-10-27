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
  Select,
  SplitDesk,
  When,
} from "@/components/ui";
import { api } from "@/lib/client";
import { roleLabel } from "@/lib/brand";
import type { PublicUser, Role } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ href: string; text: string }[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function load() {
    const res = await api<{ data: PublicUser[] }>("/api/users");
    setUsers(res.data ?? []);
  }

  useEffect(() => {
    load().catch((error: Error) =>
      setMessage({ ok: false, text: error.message }),
    );
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = [];
    if (!name.trim()) next.push({ href: "#name", text: "Name is required" });
    if (!email.trim()) next.push({ href: "#email", text: "Email is required" });
    if (password.length < 8)
      next.push({ href: "#password", text: "Use at least 8 characters" });
    setErrors(next);
    if (next.length) return;
    setPending(true);
    setMessage(null);
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setMessage({ ok: true, text: "Staff account created." });
      await load();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not create account",
      });
    } finally {
      setPending(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      await api(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not update account",
      });
    }
  }

  return (
    <div>
      <PageIntro
        kicker="Account"
        title="Team"
        description="Admins manage payouts, refunds, and staff. Staff can create customers and payment links."
      />
      {message ? (
        <div className="mb-6">
          <Banner tone={message.ok ? "ok" : "warn"} title={message.text} />
        </div>
      ) : null}

      <SplitDesk
        form={
          <CreateCard kicker="Invite" title="Add teammate">
            <form onSubmit={onSubmit} className="grid gap-4">
              <ErrorSummary id="user-errors" errors={errors} />
              <Field id="name" label="Name">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field id="email" label="Email">
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field id="password" label="Password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field id="role" label="Role">
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="user">Staff</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <Button type="submit" pending={pending} disabled={pending}>
                Create account
              </Button>
            </form>
          </CreateCard>
        }
      >
        <ListPane
          title="People"
          meta={`${users.length} ${users.length === 1 ? "member" : "members"}`}
        >
          {users.length === 0 ? (
            <Empty
              title="No team members"
              body="Add a teammate on the left to give them console access."
            />
          ) : (
            <div className="table-wrap overflow-hidden rounded-[1.75rem] border border-line bg-panel shadow-[var(--shadow)]">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-line">
                      <td className="px-5 py-3.5 font-medium">{user.name}</td>
                      <td className="px-5 py-3.5">{user.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold">
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {user.active ? "Active" : "Disabled"}
                      </td>
                      <td className="px-5 py-3.5">
                        <When value={user.createdAt} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Button
                          type="button"
                          tone="ghost"
                          onClick={() =>
                            void patch(user.id, { active: !user.active })
                          }
                        >
                          {user.active ? "Disable" : "Enable"}
                        </Button>
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
