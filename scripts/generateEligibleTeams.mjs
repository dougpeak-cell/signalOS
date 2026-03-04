// scripts/generateEligibleTeams.mjs
// Generates a list of "structurally eligible" NCAA D1 men's basketball teams
// by scraping the NCAA NET rankings page and filtering known transition/ineligible programs.
//
// Usage:
//   node scripts/generateEligibleTeams.mjs
//
// Outputs:
//   ./eligible_teams.csv
//   ./eligible_teams.sql

import fs from "node:fs";

const NET_URL =
  "https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings";

// Transition / reclassifying (ineligible) examples.
// Update this list if the NCAA adds/removes transition programs.
const INELIGIBLE_TRANSITION = new Set([
  "West Ga.",
  "West Ga", // sometimes appears without period
  "West Georgia",
  "Mercyhurst",
  "Le Moyne",
  "Queens",
  "Queens (NC)",
  "Stonehill",
  "Lindenwood",
  "Southern Indiana",
  "East Texas A&M",
  // If you ever see others in NET that are transition, add them here.
]);

function normalizeName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

// NET lines look like:
// "114 St. Thomas (MN) 18-8 Summit League ..."
// We want: rank + School.
// We'll parse by: start of line -> rank number -> school name -> record "##-##"
function parseTeamsFromHtml(html) {
  const teams = [];
  const lines = html.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // quick reject: must start with rank number
    if (!/^\d+\s+/.test(line)) continue;

    // find first record pattern like "25-2" (wins-losses)
    const m = line.match(/^(\d+)\s+(.+?)\s+(\d{1,2}-\d{1,2})\s+/);
    if (!m) continue;

    const rank = Number(m[1]);
    const school = normalizeName(m[2]);

    // sanity
    if (!school || !Number.isFinite(rank)) continue;

    teams.push({ rank, school });
  }

  // de-dupe by school (NET page sometimes has repeated header fragments)
  const seen = new Set();
  const deduped = [];
  for (const t of teams) {
    const key = t.school.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }

  return deduped;
}

async function main() {
  const res = await fetch(NET_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch NET page: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const allTeams = parseTeamsFromHtml(html);

  if (allTeams.length < 300) {
    console.warn(
      `Warning: only parsed ${allTeams.length} teams. The page format may have changed.`
    );
  }

  const eligible = allTeams
    .filter((t) => !INELIGIBLE_TRANSITION.has(t.school))
    .sort((a, b) => a.school.localeCompare(b.school));

  // CSV
  const csvLines = [
    "school,source,eligible_reason",
    ...eligible.map(
      (t) =>
        `"${t.school.replace(/"/g, '""')}",` +
        `"NCAA NET rankings page",` +
        `"Division I (not in transition list)"`
    ),
  ];
  fs.writeFileSync("eligible_teams.csv", csvLines.join("\n"), "utf8");

  // SQL (simple table example)
  const sql = [];
  sql.push("-- Create table (edit to match your schema)");
  sql.push(`-- CREATE TABLE IF NOT EXISTS ncaa_teams (`);
  sql.push(`--   id bigserial primary key,`);
  sql.push(`--   name text unique not null`);
  sql.push(`-- );`);
  sql.push("");
  sql.push("-- Inserts");
  for (const t of eligible) {
    const safe = t.school.replace(/'/g, "''");
    sql.push(
      `INSERT INTO ncaa_teams (name) VALUES ('${safe}') ON CONFLICT (name) DO NOTHING;`
    );
  }
  fs.writeFileSync("eligible_teams.sql", sql.join("\n"), "utf8");

  console.log(`Parsed teams: ${allTeams.length}`);
  console.log(`Eligible teams: ${eligible.length}`);
  console.log("Wrote: eligible_teams.csv");
  console.log("Wrote: eligible_teams.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
