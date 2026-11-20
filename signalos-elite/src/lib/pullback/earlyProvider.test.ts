import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ insiders: vi.fn(), senate: vi.fn(), institutional: vi.fn() }));
vi.mock("@/lib/experts/fmpInsiders", async (original) => ({
  ...await original<typeof import("@/lib/experts/fmpInsiders")>(), loadFmpInsiderTradesFeed: mocks.insiders,
}));
vi.mock("@/lib/experts/fmpSenate", () => ({ loadSenatePurchases: mocks.senate }));
vi.mock("@/lib/experts/fmpInstitutionalActivity", () => ({ loadInstitutionalActivity: mocks.institutional }));
import { loadEarlyEvidence } from "./earlyProvider";
import { FmpDataError } from "@/lib/experts/fmpClient";
import { ratings } from "../../../tests/pullback/fixtures";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insiders.mockResolvedValue({ rows: [], warnings: [] });
  mocks.senate.mockResolvedValue({ rows: [], warnings: [] });
  mocks.institutional.mockResolvedValue({ quarters: [], warnings: [] });
});
describe("early source isolation and coverage", () => {
  it("preserves verified upgrades when another source fails and explicitly exposes the missing individual-trade feed", async () => {
    mocks.institutional.mockRejectedValue(new FmpDataError("Filing access unavailable."));
    const result = await loadEarlyEvidence("TEST", ["CFRA"], "2026-11-19T16:00:00Z", new Date("2026-11-20T19:00:00Z"),
      Promise.resolve([{ ...ratings[0], publishedAt: "2026-11-20", previousRating: "Hold", action: "upgrade" }]));
    expect(result.signals).toHaveLength(1);
    expect(result.warnings.join(" ")).toContain("Filing access unavailable");
    expect(result.warnings.join(" ")).toContain("single $50,000 purchase cannot be verified");
    expect(mocks.insiders).toHaveBeenCalledWith(null, { symbol: "TEST" });
    expect(mocks.institutional).toHaveBeenCalledWith("TEST", expect.objectContaining({ latestQuarterOnly: true }));
  });
});
