import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const API_KEY = process.env.BALLDONTLIE_API_KEY;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
if (!SERVICE_ROLE) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!API_KEY) throw new Error("Missing BALLDONTLIE_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const BASE = "https://api.balldontlie.io/ncaab/v1";

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: API_KEY as string },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

function toInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  console.log("🚀 seedTeams starting...");

  let page = 1;
  let total = 0;

  while (true) {
    const j = await fetchJson(`/teams?page=${page}&per_page=100`);
    const data = j?.data ?? [];
    if (!data.length) break;

    const rows = data.map((t: any) => {
      const id = Number(t.id);

      const base = String((t.full_name ?? t.name ?? "")).trim();
      const abbr = String(t.abbreviation ?? "").trim();

      // Guarantee uniqueness even if base is just "Eagles"
      const name =
        base.length > 0
          ? (abbr ? `${base} (${abbr})` : `${base} (#${id})`)
          : `Team #${id}`;

      return {
        id,
        name,
        abbreviation: abbr || null,
      };
    });

    const { error } = await supabase.from("teams").upsert(rows, { onConflict: "id" });
    if (error) throw error;

    total += rows.length;
    console.log(`Page ${page}: upserted=${rows.length} total=${total}`);
    page++;
  }

  console.log(`✅ Done. Upserted teams: ${total}`);
}

main().catch((e) => {
  console.error("❌ seedTeams failed:", e);
  process.exit(1);
});