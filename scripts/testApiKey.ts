import { config } from "dotenv";
config({ path: ".env.local" });

const API_KEY = process.env.NCAAB_API_KEY!;
const BASE = "https://api.balldontlie.io/ncaab/v1";

async function tryReq(name: string, headers: Record<string, string>) {
  const res = await fetch(`${BASE}/teams?per_page=1`, { headers });
  const text = await res.text();
  console.log(`\n=== ${name} ===`);
  console.log("Status:", res.status);
  console.log("Body (first 200):", text.slice(0, 200));
}

async function main() {
  if (!API_KEY) throw new Error("Missing NCAAB_API_KEY in .env.local");
  console.log("Key length:", API_KEY.length);

  await tryReq("Authorization: <key>", { Authorization: API_KEY });
  await tryReq("Authorization: Bearer <key>", { Authorization: `Bearer ${API_KEY}` });
  await tryReq("X-API-KEY", { "X-API-KEY": API_KEY });
}

main().catch(console.error);
