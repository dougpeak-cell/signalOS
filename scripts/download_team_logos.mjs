// scripts/download_team_logos.mjs
// Downloads ALL NCAA D1 men's basketball team logos into /public/team-logos
// Uses ESPN core API (paginated) so it includes Duke and everyone else.
//
// Run:
//   node scripts/download_team_logos.mjs

import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("./public/team-logos");

// ESPN core API (paginated)
const BASE =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/teams";

const LIMIT = 500; // big page size
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 8;

function slugify(name) {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText}: ${url}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchAllTeams() {
  const url = `${BASE}?limit=${LIMIT}`;
  const json = await fetchJson(url);

  // ESPN core returns { items: [ { $ref }, ... ] }
  const refs = json?.items ?? [];
  if (!refs.length) {
    throw new Error("No teams returned from ESPN core API.");
  }

  // resolve each team ref to get displayName + logos
  const teams = [];
  let idx = 0;

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= refs.length) return;
      const ref = refs[i]?.$ref;
      if (!ref) continue;

      try {
        const team = await fetchJson(ref);
        teams.push(team);
      } catch (e) {
        // ignore individual failures
      }
      await sleep(40);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return teams;
}

async function downloadLogo(url, outPath) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Logo HTTP ${res.status}`);

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("image")) throw new Error(`Not image: ${ct}`);

    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    return true;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Fetching all NCAA teams from ESPN core API...");
  const teams = await fetchAllTeams();
  console.log(`Resolved teams: ${teams.length}`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // try to find Duke (debug)
  const duke = teams.find((t) => {
    const candidates = [
      t?.displayName,
      t?.shortDisplayName,
      t?.name,
      t?.location,
      `${t?.location ?? ""} ${t?.name ?? ""}`.trim(),
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    return candidates.some((s) => s === "duke" || s.includes("duke"));
  });

  console.log(
    "Duke found:",
    Boolean(duke),
    duke?.displayName ?? duke?.shortDisplayName ?? duke?.name
  );

  for (const t of teams) {
    const name = t?.shortDisplayName || t?.displayName || t?.name;
    if (!name) continue;

    const slug = slugify(name);
    if (!slug) continue;

    const outPathBase = path.join(OUT_DIR, slug);

    // ✅ skip early (avoid needless fetch)
    if (
      fs.existsSync(outPathBase + ".png") ||
      fs.existsSync(outPathBase + ".svg") ||
      fs.existsSync(outPathBase + ".jpg") ||
      fs.existsSync(outPathBase + ".webp")
    ) {
      skipped++;
      continue;
    }

    const logoUrl = t?.logos?.[0]?.href || t?.logo || null;
    if (!logoUrl) {
      failed++;
      continue;
    }

    try {
      const res = await fetch(logoUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`Logo HTTP ${res.status}`);

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const urlLower = logoUrl.toLowerCase();

      let ext = ".png";
      if (ct.includes("svg") || urlLower.endsWith(".svg")) ext = ".svg";
      else if (ct.includes("webp") || urlLower.endsWith(".webp")) ext = ".webp";
      else if (
        ct.includes("jpeg") ||
        ct.includes("jpg") ||
        urlLower.endsWith(".jpg") ||
        urlLower.endsWith(".jpeg")
      )
        ext = ".jpg";
      else if (ct.includes("png") || urlLower.endsWith(".png")) ext = ".png";
      else if (ct.includes("image/")) ext = ".img";
      else throw new Error(`Not image content-type: ${ct}`);

      const outPath = outPathBase + ext;

      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      downloaded++;

      if (downloaded <= 10 || downloaded % 50 === 0) {
        console.log("Downloaded:", path.basename(outPath));
      }
    } catch (e) {
      failed++;
      if (failed <= 20) {
        console.log("FAILED:", name, "|", logoUrl, "|", String(e?.message ?? e));
      }
    }

    if ((downloaded + failed) % 25 === 0) {
      console.log(`Progress: downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
    }
    await sleep(25);
  }

  console.log("----");
  console.log(`Done. Downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
  console.log(`Folder: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
