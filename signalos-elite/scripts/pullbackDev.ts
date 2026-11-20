import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const mode = process.argv[2];
if (!["app", "monitor", "check"].includes(mode)) {
  throw new Error("Usage: tsx scripts/pullbackDev.ts app|monitor|check");
}

const existing = parse(readFileSync(".env.local"));
const development = parse(readFileSync(".env.pullback-dev.local"));
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"]) {
  if (!development[name]?.trim()) {
    throw new Error(`Configure ${name} in .env.pullback-dev.local.`);
  }
}
const database = new URL(development.NEXT_PUBLIC_SUPABASE_URL);
if (database.protocol !== "https:" || !database.hostname.endsWith(".supabase.co") ||
    database.origin === new URL(existing.NEXT_PUBLIC_SUPABASE_URL).origin) {
  throw new Error("Pullback development must use a separate hosted Supabase project, not .env.local's project.");
}
const origin = new URL(development.PULLBACK_LOCAL_ORIGIN);
if (origin.origin !== "http://localhost:3101" || origin.href !== `${origin.origin}/`) {
  throw new Error("Set PULLBACK_LOCAL_ORIGIN to http://localhost:3101 so Next.js authentication and same-origin checks use one hostname.");
}

if (mode === "check") {
  console.log("Pullback development configuration is isolated; credentials were not displayed.");
} else {
  const args = mode === "app"
    ? [resolve("node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", "3101"]
    : ["--import", "tsx", resolve("scripts", "pullbackWatch.ts")];
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...existing, ...development, NODE_ENV: "development" },
  });
  child.on("error", (error: Error) => {
    console.error(`Pullback development ${mode} could not start: ${error.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code: number | null) => { process.exitCode = code ?? 1; });
}
