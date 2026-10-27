import { NextResponse } from "next/server";
import { originFromRequest } from "@/lib/checkout";
import { connectionInfo } from "@/lib/listopays";
import { SHARED_OFFER } from "@/lib/offer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = originFromRequest(request);
  const info = connectionInfo();
  return NextResponse.json({
    success: true,
    data: {
      brand: info.merchantName,
      connected: info.hasPublicKey && info.hasPrivateKey,
      checkoutOrigin: origin,
      sharedPayUrl: `${origin}${SHARED_OFFER.path}`,
      sharedPayAmount: `${SHARED_OFFER.amount} ${SHARED_OFFER.currency}`,
      webhookUrl: `${origin}/api/webhook`,
    },
  });
}
