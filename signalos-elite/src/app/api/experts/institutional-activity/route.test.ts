import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInstitutionalActivity } from "@/lib/experts/institutionalActivity";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(async () => ({ hasProFeatures: false })),
  load: vi.fn(),
}));
vi.mock("@/lib/sigi/settings", () => ({ getSigiSettingsViewForCurrentUser: mocks.settings }));
vi.mock("@/lib/experts/fmpInstitutionalActivity", () => ({ loadInstitutionalActivity: mocks.load }));
import { GET } from "./route";

afterEach(() => { vi.clearAllMocks(); });

describe("institutional activity access and missing coverage", () => {
  it("checks Pro access before requesting any historical provider data", async () => {
    mocks.settings.mockResolvedValue({ hasProFeatures: false });
    const response = await GET(new Request("http://localhost/api/experts/institutional-activity?symbol=AAPL"));
    expect(response.status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("returns explicit unavailable history, not successful zero activity, when no quarters can be compared", async () => {
    mocks.settings.mockResolvedValue({ hasProFeatures: true });
    const activity = buildInstitutionalActivity({
      symbol: "AAPL", today: "2026-11-16", funds: [{ name: "Fund", cik: "1" }], reports: [], splits: [], prices: [],
    });
    mocks.load.mockResolvedValue(activity);
    const response = await GET(new Request("http://localhost/api/experts/institutional-activity?symbol=AAPL"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, activity: { symbol: "AAPL" }, error: expect.any(String) });
  });
});
