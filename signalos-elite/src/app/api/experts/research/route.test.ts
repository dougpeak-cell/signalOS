import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  load: vi.fn(),
}));
vi.mock("@/lib/sigi/settings", () => ({ getSigiSettingsViewForCurrentUser: mocks.settings }));
vi.mock("@/lib/experts/loadResearchAlignment", () => ({ loadResearchAlignment: mocks.load }));

import { GET } from "./route";

describe("Research Alignment API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings.mockResolvedValue({ hasProFeatures: true });
  });

  it("rejects invalid tickers before loading premium providers", async () => {
    const response = await GET(new Request("https://signalos.test/api/experts/research?symbol=../bad"));
    expect(response.status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.settings).not.toHaveBeenCalled();
  });

  it.each(["free", "smart"])("blocks %s access before fetching research", async () => {
    mocks.settings.mockResolvedValue({ hasProFeatures: false });
    const response = await GET(new Request("https://signalos.test/api/experts/research?symbol=AMZN"));
    expect(response.status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("returns partial evidence for Pro without requiring all providers", async () => {
    mocks.load.mockResolvedValue({
      symbol: "AMZN",
      analysts: { status: "available", data: { consensus: "Buy" } },
      institutions: { status: "unavailable", error: "Holdings unavailable" },
      amsa: { status: "unavailable", error: "AMSA unavailable" },
    });
    const response = await GET(new Request("https://signalos.test/api/experts/research?symbol=amzn"));
    expect(response.status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith("AMZN");
    expect((await response.json()).ok).toBe(true);
  });

  it("returns 503 and source errors when nothing can be verified", async () => {
    mocks.load.mockResolvedValue({
      symbol: "AMZN",
      analysts: { status: "unavailable", error: "Analysts unavailable" },
      institutions: { status: "unavailable", error: "Holdings unavailable" },
      amsa: { status: "unavailable", error: "AMSA unavailable" },
    });
    const response = await GET(new Request("https://signalos.test/api/experts/research?symbol=AMZN"));
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.institutions.error).toBe("Holdings unavailable");
  });
});
