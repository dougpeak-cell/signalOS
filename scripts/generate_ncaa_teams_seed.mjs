// scripts/generate_ncaa_teams_seed.mjs
// Generates NCAA teams seed using ESPN core API (full list) and matches your logo downloader slugs.
// Outputs:
//   teams_seed.csv
//   teams_seed.sql
//
// Run:
//   node scripts/generate_ncaa_teams_seed.mjs

import fs from "node:fs";
import path from "node:path";

// ESPN core API gives the full league list (more reliable than site.api)
const BASE =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/teams";

const LIMIT = 500;

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

// Detect which logo file extension actually exists locally
function pickExistingLogoUrl(slug) {
  const base = path.resolve("public", "team-logos", slug);
  const candidates = [".png", ".webp", ".svg", ".jpg"];

  for (const ext of candidates) {
    if (fs.existsSync(base + ext)) return `/team-logos/${slug}${ext}`;
  }
  return "/team-logos/default.png";
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  console.log("Fetching NCAA teams from ESPN core API...");

  const list = await fetchJson(`${BASE}?limit=${LIMIT}`);
  const refs = list?.items ?? [];

  if (!refs.length) {
    throw new Error("No teams returned. ESPN core API format may have changed.");
  }

  // Resolve each $ref to get name fields + id
  const teams = [];
  for (const it of refs) {
    const ref = it?.$ref;
    if (!ref) continue;
    try {
      const t = await fetchJson(ref);

      const name =
        t?.shortDisplayName ||
        t?.displayName ||
        t?.name ||
        null;

      if (!name) continue;

      const slug = slugify(name);
      if (!slug) continue;

      const espn_team_id = t?.id ? String(t.id) : null;

      teams.push({ name, slug, espn_team_id });
    } catch {
      // ignore individual failures
    }
  }

  // de-dupe by name
  const seen = new Set();
  const deduped = [];
  for (const t of teams) {
    const key = t.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }

  deduped.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found ${deduped.length} teams`);

  // CSV (logo_url is chosen based on what exists in public/team-logos)
  const csv = [
    "name,slug,logo_url,espn_team_id",
    ...deduped.map((t) => {
      const logo_url = pickExistingLogoUrl(t.slug);
      return `"${t.name.replace(/"/g, '""')}",${t.slug},${logo_url},${t.espn_team_id ?? ""}`;
    }),
  ].join("\n");

  fs.writeFileSync("teams_seed.csv", csv, "utf8");

  // SQL: add columns + unique index; upsert by name
  const sqlLines = [];
  sqlLines.push("BEGIN;");
  sqlLines.push("");
  sqlLines.push("ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug text;");
  sqlLines.push("ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url text;");
  sqlLines.push("ALTER TABLE teams ADD COLUMN IF NOT EXISTS espn_team_id text;");
  sqlLines.push("CREATE UNIQUE INDEX IF NOT EXISTS teams_name_unique ON teams (name);");
  sqlLines.push("");

  sqlLines.push("INSERT INTO teams (name, slug, logo_url, espn_team_id)");
  sqlLines.push("VALUES");

  for (let i = 0; i < deduped.length; i++) {
    const t = deduped[i];
    const logo_url = pickExistingLogoUrl(t.slug);

    const nameSql = t.name.replace(/'/g, "''");
    const slugSql = t.slug.replace(/'/g, "''");
    const logoSql = logo_url.replace(/'/g, "''");
    const idSql = (t.espn_team_id ?? "").replace(/'/g, "''");

    sqlLines.push(
      `  ('${nameSql}', '${slugSql}', '${logoSql}', ${idSql ? `'${idSql}'` : "NULL"})${
        i === deduped.length - 1 ? "" : ","
      }`
    );
  }

  sqlLines.push("ON CONFLICT (name) DO UPDATE");
  sqlLines.push("SET slug = EXCLUDED.slug,");
  sqlLines.push("    logo_url = EXCLUDED.logo_url,");
  sqlLines.push("    espn_team_id = EXCLUDED.espn_team_id;");
  sqlLines.push("");
  sqlLines.push("COMMIT;");

  fs.writeFileSync("teams_seed.sql", sqlLines.join("\n"), "utf8");

  console.log("Created teams_seed.csv and teams_seed.sql");
  console.log("Tip: run `dir public\\team-logos` to confirm logos exist before seeding.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
