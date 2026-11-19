import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  settings: vi.fn(), client: vi.fn(), load: vi.fn(), process: vi.fn(), save: vi.fn(),
}));
vi.mock("@/lib/sigi/settings", () => ({ getSigiSettingsViewForCurrentUser: mocks.settings }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("@/lib/pullback/provider", () => ({ loadPullbackItem: mocks.load }));
vi.mock("@/lib/pullback/store", () => ({ processPullbackWatch: mocks.process, savePullbackWatch: mocks.save }));
import { GET, POST } from "./route";

const url = "https://signalos.test/api/pullback-watch";
function post(body: unknown): Request {
  return new Request(url, { method: "POST", headers: { origin: "https://signalos.test", "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.settings.mockResolvedValue({ hasProFeatures: true });
  mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) } });
});

describe("Pullback Watch access and notification preferences", () => {
  it("uses the existing Pro research gate on both reads and writes", async () => {
    mocks.settings.mockResolvedValue({ hasProFeatures: false });
    expect((await GET(new Request(`${url}?symbol=AAPL`))).status).toBe(403);
    expect((await POST(post({ symbol: "AAPL", notify: true, trustedFirms: ["CFRA", "Argus"] }))).status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("requires authentication and same-origin writes even with development plan previews", async () => {
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } });
    expect((await POST(post({ symbol: "AAPL", notify: true, trustedFirms: ["CFRA"] }))).status).toBe(401);
    expect((await POST(new Request(url, { method: "POST", headers: { origin: "https://elsewhere.test" } }))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects duplicated or unverified firm identities and persists an authenticated opt-in", async () => {
    for (const trustedFirms of [["CFRA", "CFRA"], ["CFRA via Schwab"], []]) {
      expect((await POST(post({ symbol: "AAPL", notify: true, trustedFirms }))).status).toBe(400);
    }
    expect((await POST(post({ symbol: "AAPL", notify: true, trustedFirms: ["CFRA", "Argus"] }))).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith("user-1", "AAPL", ["CFRA", "Argus"], true);
  });
});
