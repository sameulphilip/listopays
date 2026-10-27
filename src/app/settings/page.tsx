"use client";

import { useEffect, useState } from "react";
import { Banner, CopyButton, PageIntro } from "@/components/ui";
import { api } from "@/lib/client";

type Info = {
  brand: string;
  connected: boolean;
  checkoutOrigin: string;
  sharedPayUrl: string;
  sharedPayAmount: string;
  webhookUrl: string;
};

export default function SettingsPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: Info }>("/api/settings")
      .then((res) => setInfo(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div>
      <PageIntro
        kicker="Account"
        title="Settings"
        description="Share the checkout link with customers. Payment updates arrive automatically."
      />
      {error ? (
        <div className="mb-6">
          <Banner tone="warn" title={error} />
        </div>
      ) : null}
      {!info ? (
        <div className="h-32 animate-pulse rounded-[1.75rem] bg-panel" aria-busy="true" />
      ) : (
        <div className="grid gap-4">
          <Row
            label="Brand"
            value={info.brand}
            hint="Shown on checkout and in this console."
          />
          <Row
            label="Status"
            value={info.connected ? "Ready" : "Not configured"}
            hint={
              info.connected
                ? "Payments can be created."
                : "Ask an administrator to finish setup."
            }
          />
          <Row
            label={`Shared checkout (${info.sharedPayAmount})`}
            value={info.sharedPayUrl}
            copy={info.sharedPayUrl}
            hint="Send this page when everyone pays the same amount."
          />
          <Row
            label="Console"
            value={info.checkoutOrigin}
            copy={info.checkoutOrigin}
          />
          <Row
            label="Payment updates"
            value={info.webhookUrl}
            copy={info.webhookUrl}
            hint="Used internally when a customer pays. No action needed."
          />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  copy,
  hint,
}: {
  label: string;
  value: string;
  copy?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-line bg-panel px-6 py-5 shadow-[var(--shadow)]">
      <p className="text-[12px] font-medium text-ink-soft">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="break-all text-[14px] font-medium">{value}</p>
        {copy ? <CopyButton value={copy} /> : null}
      </div>
      {hint ? <p className="mt-2 text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}
