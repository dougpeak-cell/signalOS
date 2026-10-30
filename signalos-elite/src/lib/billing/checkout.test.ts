import { describe, expect, it, vi } from "vitest";
import { createCheckoutSessionForPlan } from "./checkout";
import { MEMBERSHIP_PAUSE_MESSAGE, MEMBERSHIP_SIGNUPS_PAUSED } from "./membershipAvailability";
import { getStripeServer } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GET, POST } from "../../app/api/stripe/checkout/route";
import { POST as legacyUpgrade } from "../../app/api/sigi/upgrade/route";

vi.mock("@/lib/billing/membershipAvailability", async () =>
  vi.importActual("./membershipAvailability"));
vi.mock("@/lib/billing/tiers", () => ({}));
vi.mock("@/lib/billing/checkout", async () => vi.importActual("./checkout"));
vi.mock("@/lib/billing/pricing", () => ({}));
vi.mock("@/lib/billing/pendingCheckout", () => ({ PENDING_CHECKOUT_PLAN_COOKIE: "pending-plan" }));
vi.mock("@/lib/stripe/server", () => ({ getStripeServer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

describe("membership construction pause", () => {
  it("blocks both paid plans before accessing Stripe or account data", async () => {
    expect(MEMBERSHIP_SIGNUPS_PAUSED).toBe(true);
    for (const plan of ["smart", "pro"]) {
      for (const interval of ["monthly", "annual"] as const) {
        await expect(createCheckoutSessionForPlan(plan, null, interval))
          .rejects.toThrow(MEMBERSHIP_PAUSE_MESSAGE);
      }
    }
    expect(getStripeServer).not.toHaveBeenCalled();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
  it("redirects direct checkout links to the construction page", async () => {
    const response = await GET(new Request("https://example.com/api/stripe/checkout?plan=pro"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/auth/upgrade");
    expect(getStripeServer).not.toHaveBeenCalled();
  });
  it("rejects current and legacy checkout POSTs before authentication or body parsing", async () => {
    for (const handler of [POST, legacyUpgrade]) {
      const response = await handler(new Request("https://example.com/api/stripe/checkout", { method: "POST", body: "invalid JSON" }));
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: MEMBERSHIP_PAUSE_MESSAGE, code: "MEMBERSHIP_SIGNUPS_PAUSED" });
    }
    expect(getStripeServer).not.toHaveBeenCalled();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});