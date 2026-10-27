import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay 34.95 USD",
  description: "Complete a secure 34.95 USD payment.",
  robots: { index: false, follow: false },
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
