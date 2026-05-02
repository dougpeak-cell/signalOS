import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || "sk_test_placeholder";

export const stripe = new Stripe(stripeSecretKey, {
  // Keep this pinned to the version your Stripe account/sdk expects.
  appInfo: {
    name: "SignalOS Elite",
  },
});

export function getStripeServer(): Stripe {
  return stripe;
}

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePortalReturnUrl(): string {
  return requireEnv("STRIPE_PORTAL_RETURN_URL");
}

export function getStripeCheckoutSuccessUrl(): string {
  return requireEnv("STRIPE_CHECKOUT_SUCCESS_URL");
}

export function getStripeCheckoutCancelUrl(): string {
  return requireEnv("STRIPE_CHECKOUT_CANCEL_URL");
}