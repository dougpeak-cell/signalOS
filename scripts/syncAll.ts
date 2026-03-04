import { config } from "dotenv";
config({ path: ".env.local" });

async function run(cmd: string) {
  const { execa } = await import("execa");
  console.log(`\n▶ ${cmd}`);
  await execa(cmd, { shell: true, stdio: "inherit" });
}

async function main() {
  console.log("🚀 SyncAll starting...");

  // Order matters because of foreign keys:
  // teams -> players -> games -> predictions
  await run("npx tsx scripts/seedTeams.ts");
  await run("npx tsx scripts/seedPlayers.ts");
  await run("npx tsx scripts/seedGames.ts");
  await run("npx tsx scripts/seedPredictions.ts");

  console.log("\n✅ SyncAll done.");
}

main().catch((e) => {
  console.error("❌ SyncAll failed:", e);
  process.exit(1);
});
