import type { PlanKey } from "@/lib/billing/pricing";

type CheckoutResponse = {
  error?: string;
  url?: string;
};

export async function startStripeUpgradeCheckout(plan: PlanKey): Promise<void> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });

  const data = (await res.json()) as CheckoutResponse;

  if (!res.ok) {
    throw new Error(data.error || "Unable to start checkout");
  }

  if (!data.url) {
    throw new Error("Unable to start checkout");
  }

  window.location.href = data.url;
}