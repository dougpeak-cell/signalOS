
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.BALLDONTLIE_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Missing Supabase env vars");
if (!API_KEY) throw new Error("Missing BALLDONTLIE_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const BASE = "https://api.balldontlie.io/ncaab/v1";

function toInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(path: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { Authorization: API_KEY! } });
  if (!res.ok) throw new Error(`API ${res.status} for ${url}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("🚀 seedPlayers starting...");

  // sanity ping
  const ping = await fetchJson(`/players/active?per_page=1`);
  console.log("✅ /players/active ok");
  console.log("sample:", ping?.data?.[0]);
  console.log("sample.team:", ping?.data?.[0]?.team);

  let cursor: number | null = null;
  let total = 0;

  while (true) {
    const qs = new URLSearchParams();
    qs.set("per_page", "100");
    if (cursor != null) qs.set("cursor", String(cursor));

    const json = await fetchJson(`/players/active?${qs.toString()}`);
    const data = json?.data ?? [];
    if (!data.length) break;


    // 1) Upsert any teams referenced by these players (so FK passes)
    const teamRows = Array.from(
      new Map<number, any>(
        data
          .map((p: any) => p?.team)
          .filter((t: any) => t && Number.isFinite(Number(t.id)))
          .map((t: any) => {
            const id = Number(t.id);
            const base = String((t.full_name ?? t.name ?? "")).trim() || `Team`;
            const abbr = String(t.abbreviation ?? "").trim();
            const name = `${base}${abbr ? ` (${abbr})` : ""} #${id}`; // ✅ unique + stable

            return [id, { id, name, abbreviation: abbr || null }];
          })
      ).values()
    );

    if (teamRows.length) {
      const { error: tErr } = await supabase.from("teams").upsert(teamRows, { onConflict: "id" });
      if (tErr) throw tErr;
    }

    const rows = data
      .map((p: any) => {
        const id = toInt(p.id);
        if (id == null) return null;

        const teamId = toInt(p.team?.id) ?? null;
        const name =
          (p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()) || "Unknown";

        const baseRow: any = {
          id,
          name,
          position: p.position ?? null,
        };
        if (teamId != null) baseRow.team_id = teamId;
        return baseRow;
      })
      .filter((r: any) => r != null);

    const nonNullTeams = rows.filter((r: any) => r.team_id != null).length;
    console.log(
      `cursor=${cursor ?? 0} fetched=${data.length} upsert=${rows.length} team_id_nonnull=${nonNullTeams}`
    );

    const { error } = await supabase.from("players").upsert(rows, { onConflict: "id" });
    if (error) throw error;

    total += rows.length;
    cursor = json?.meta?.next_cursor ?? null;
    if (cursor == null) break;
  }

  console.log(`✅ Done. Upserted players: ${total}`);
}

main().catch((e) => {
  console.error("❌ seedPlayers failed:", e);
  process.exit(1);
});