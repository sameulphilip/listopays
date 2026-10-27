import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure checkout",
  description: "Complete your payment.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
