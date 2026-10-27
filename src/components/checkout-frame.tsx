"use client";

import { useEffect, useRef } from "react";

export function CheckoutFrame({
  token,
  src,
}: {
  token: string;
  src: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    async function markPaid() {
      if (sent.current) return;
      sent.current = true;
      try {
        const res = await fetch("/api/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          keepalive: true,
        });
        if (!res.ok) sent.current = false;
      } catch {
        sent.current = false;
      }
    }

    const timer = window.setInterval(() => {
      try {
        const path = frameRef.current?.contentWindow?.location.pathname ?? "";
        if (
          /\/(success|fail|failed|failure|error|declined|rejected|cancel|cancelled|canceled|expired)\/?$/i.test(
            path,
          )
        )
          void markPaid();
      } catch {
        /* iframe may briefly be cross-origin while the gateway loads */
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [token]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title="Secure checkout"
      className="min-h-0 w-full flex-1 border-0 bg-paper"
      allow="payment *"
      loading="eager"
    />
  );
}
