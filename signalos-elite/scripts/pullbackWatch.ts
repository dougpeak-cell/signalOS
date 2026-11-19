export {};

const origin = new URL(process.env.PULLBACK_LOCAL_ORIGIN ?? "http://localhost:3100");
if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
  throw new Error("The local Pullback Watch monitor only accepts loopback origins.");
}
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("Configure CRON_SECRET in .env.local for both the app and local monitor.");

async function monitor(): Promise<void> {
  while (true) {
    try {
      const response = await fetch(new URL("/api/cron/pullback-watch", origin), {
        headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(290_000),
      });
      if (!response.ok) console.error(`Pullback Watch processing failed (HTTP ${response.status}). Inspect local server logs; no delivery is implied.`);
      else console.log(`Pullback Watch processed at ${new Date().toISOString()}.`);
    } catch {
      console.error("Pullback Watch local server could not be reached. No delivery is implied.");
    }
    await new Promise((resolve) => setTimeout(resolve, 60_000 - (Date.now() % 60_000)));
  }
}
void monitor();
