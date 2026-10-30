import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ settings: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/sigi/settings", () => ({ getSigiSettingsViewForCurrentUser: mocks.settings }));
vi.mock("@/lib/experts/fmpSenate", () => ({ loadSenatePurchases: mocks.load }));
vi.mock("@/lib/experts/fmpClient", async () => import("../../../../lib/experts/fmpClient"));
vi.mock("@/lib/experts/senatePurchases", async () => import("../../../../lib/experts/senatePurchases"));
vi.mock("@/lib/experts/hedgeFundInvestments", async () => import("../../../../lib/experts/hedgeFundInvestments"));
import { GET } from "./route";
import { FmpDataError } from "@/lib/experts/fmpClient";

describe("Senate purchases API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings.mockResolvedValue({ hasProFeatures: true });
    mocks.load.mockResolvedValue({ rows: [], warnings: [] });
  });
  it.each(["period=invalid", "basis=invalid"])("rejects invalid filters: %s", async (query) => {
    const response = await GET(new Request(`https://signalos.test/api/experts/senate?${query}`));
    expect(response.status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("blocks non-Pro access before provider calls", async () => {
    mocks.settings.mockResolvedValue({ hasProFeatures: false });
    const response = await GET(new Request("https://signalos.test/api/experts/senate"));
    expect(response.status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("defaults to weekly disclosure-date results", async () => {
    const response = await GET(new Request("https://signalos.test/api/experts/senate"));
    expect(response.status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith("week", "disclosure");
  });
  it("passes purchase-date and year filters through", async () => {
    await GET(new Request("https://signalos.test/api/experts/senate?period=year&basis=purchase"));
    expect(mocks.load).toHaveBeenCalledWith("year", "purchase");
  });
  it("returns explicit entitlement errors instead of empty success", async () => {
    mocks.load.mockRejectedValue(new FmpDataError("Subscription required", 503));
    const response = await GET(new Request("https://signalos.test/api/experts/senate"));
    expect(response.status).toBe(503);
    expect((await response.json()).ok).toBe(false);
  });
});
