import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckoutSessionForPlan } from "./checkout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GET, POST } from "../../app/api/stripe/checkout/route";
import { POST as legacyUpgrade } from "../../app/api/sigi/upgrade/route";

vi.mock("@/lib/billing/tiers", async () => ({
  ...await vi.importActual("./tiers"),
  getStripePriceIdForTier: vi.fn(() => "price_test"),
}));
vi.mock("@/lib/stripe/server", () => ({ getStripeServer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
  })),
}));

beforeEach(() => vi.clearAllMocks());

describe("reopened membership signups", () => {
  it("allows paid plans to reach authentication instead of the construction guard", async () => {
    for (const plan of ["smart", "pro"]) {
      for (const interval of ["monthly", "annual"] as const) {
        await expect(createCheckoutSessionForPlan(plan, null, interval))
          .rejects.toThrow("You must be signed in to upgrade.");
      }
    }
    expect(createSupabaseServerClient).toHaveBeenCalledTimes(4);
  });

  it("preserves the selected plan when directing signed-out checkout visitors to signup", async () => {
    const response = await GET(new Request("https://example.com/api/stripe/checkout?plan=pro&returnTo=%2Fwatchlist"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/upgrade");
    expect(location.searchParams.get("plan")).toBe("pro");
    expect(location.searchParams.get("returnTo")).toBe("/watchlist");
    expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
  });

  it("keeps authentication enforced for current and legacy checkout POSTs without a pause response", async () => {
    for (const handler of [POST, legacyUpgrade]) {
      const response = await handler(new Request("https://example.com/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "smart", tier: "smart" }),
      }));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "You must be signed in to upgrade." });
    }
    expect(createSupabaseServerClient).toHaveBeenCalledTimes(2);
  });
});
