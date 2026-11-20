import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const launcher = resolve("scripts", "pullbackDev.ts");
const tsx = pathToFileURL(createRequire(resolve("package.json")).resolve("tsx")).href;

function check(overrides: Record<string, string> = {}): ReturnType<typeof spawnSync> {
  const directory = mkdtempSync(join(tmpdir(), "pullback-dev-"));
  try {
    writeFileSync(join(directory, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://existing.supabase.co\n");
    const development = {
      NEXT_PUBLIC_SUPABASE_URL: "https://development.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-not-a-real-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-not-a-real-key",
      CRON_SECRET: "test-cron-not-a-real-secret",
      PULLBACK_LOCAL_ORIGIN: "http://localhost:3101",
      ...overrides,
    };
    writeFileSync(join(directory, ".env.pullback-dev.local"),
      Object.entries(development).map(([name, value]) => `${name}=${value}`).join("\n"));
    return spawnSync(process.execPath, ["--import", tsx, launcher, "check"], {
      cwd: directory, encoding: "utf8", timeout: 15_000,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("isolated Pullback development launch", () => {
  it("accepts a separate project without displaying credentials", () => {
    const result = check();
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain("configuration is isolated");
    expect(`${result.stdout}${result.stderr}`).not.toContain("test-service-not-a-real-key");
  });

  it("rejects the existing project even with different URL formatting", () => {
    const result = check({ NEXT_PUBLIC_SUPABASE_URL: "https://existing.supabase.co/" });
    expect(result.status).not.toBe(0);
    expect(String(result.stderr)).toContain("separate hosted Supabase project");
  });

  it("refuses incomplete credentials and a nonlocal monitor", () => {
    const missing = check({ SUPABASE_SERVICE_ROLE_KEY: "" });
    expect(missing.status).not.toBe(0);
    expect(String(missing.stderr)).toContain("Configure SUPABASE_SERVICE_ROLE_KEY");
    const remote = check({ PULLBACK_LOCAL_ORIGIN: "https://example.test" });
    expect(remote.status).not.toBe(0);
    expect(String(remote.stderr)).toContain("Set PULLBACK_LOCAL_ORIGIN");
  });
});
