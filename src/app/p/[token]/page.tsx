import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { CheckoutFrame } from "@/components/checkout-frame";
import { isPaymentToken } from "@/lib/checkout";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PublicCheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isPaymentToken(token)) notFound();

  const payment = readStore().payments.find((item) => item.token === token);
  const src = `/payment/${encodeURIComponent(token)}`;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <BrandMark subtitle="Secure checkout" />
        {payment ? (
          <p className="text-[13px] text-ink-soft">
            {payment.amount} {payment.currency}
          </p>
        ) : null}
      </header>
      <CheckoutFrame token={token} src={src} />
    </div>
  );
}
