import Stripe from "stripe";

function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`${names.join(" or ")} is not configured.`);
}

function getSiteUrl(): string {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return `https://${deploymentHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

function buildAppUrl(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

function normalizeReturnPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

let stripeServer: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (stripeServer) {
    return stripeServer;
  }

  stripeServer = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    appInfo: {
      name: "SignalOS Elite",
    },
  });

  return stripeServer;
}

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePortalReturnUrl(): string {
  return process.env.STRIPE_PORTAL_RETURN_URL?.trim() || buildAppUrl("/settings/sigi");
}

export function getStripeCheckoutSuccessUrl(returnTo?: string | null): string {
  if (process.env.STRIPE_CHECKOUT_SUCCESS_URL?.trim()) {
    return process.env.STRIPE_CHECKOUT_SUCCESS_URL.trim();
  }

  const safeReturnTo = normalizeReturnPath(returnTo);

  if (!safeReturnTo) {
    return buildAppUrl("/settings/sigi?checkout=success");
  }

  const successUrl = new URL(safeReturnTo, `${getSiteUrl()}/`);
  successUrl.searchParams.set("checkout", "success");
  return successUrl.toString();
}

export function getStripeCheckoutCancelUrl(): string {
  return process.env.STRIPE_CHECKOUT_CANCEL_URL?.trim() || buildAppUrl("/settings/sigi?checkout=cancelled");
}