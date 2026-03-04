import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ✅ put this in .env.local (and in Prod env vars later)
const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s): s is string => Boolean(s));

const ODDS_API_KEY: string | null = process.env.ODDS_API_KEY ?? null;

// --- tiny helpers ---
function j(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function assert(cond: any, msg: string, status = 400) {
  if (!cond) throw Object.assign(new Error(msg), { status });
}

type UpsertRow = {
  source: string; // "oddsapi"
  sport_key: string;
  event_id: string;
  commence_time: string | null;
  home_team: string | null;
  away_team: string | null;
  book_key: string | null;
  book_title: string | null;
  book_last_update: string | null;
  market: string; // "player_points" etc
  side: string; // "over" | "under" | "line"
  player_name: string | null;
  line: number | null;
  price: number | null;
  fetched_at: string;
  raw: any;
};

function nowIso() {
  return new Date().toISOString();
}

/**
 * Odds API endpoints differ by plan/market.
 * This importer is written to be resilient:
 * - It stores whatever player props it finds (if available)
 * - If your plan doesn't include player props, it returns a friendly message.
 *
 * You can later swap this to your exact provider/endpoint without changing the UI.
 */
async function fetchOddsApiJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Odds API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  const CRON_SECRET = process.env.CRON_SECRET ?? "";
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const isCron = CRON_SECRET && cronHeader === CRON_SECRET;

  try {
    // 1) auth + admin gate
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();

    const user = auth?.user;
    if (!user) return j({ ok: false, error: "Not logged in" }, 401);

    const email = (user.email ?? "").toLowerCase();
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
      return j({ ok: false, error: "Not authorized" }, 403);
    }

    if (!ODDS_API_KEY) return j({ ok: false, error: "Missing ODDS_API_KEY in env" }, 500);
    const apiKey = ODDS_API_KEY; // now typed as string

    // 2) pick sport + markets
    // NCAAB key on TheOddsAPI is usually: basketball_ncaab
    const sportKey = "basketball_ncaab";

    // Try common player props market keys used by providers
    // We'll attempt multiple and accept whichever returns data.
    const candidateMarkets = [
      "player_points",
      "player_rebounds",
      "player_assists",
      "player_points_rebounds_assists",
      "player_pts",
      "player_reb",
      "player_ast",
    ];

    const regions = "us";
    const books = ""; // optional: e.g. "draftkings,fanduel"
    const oddsFormat = "american";

    // 3) fetch events list (standard)
    // TheOddsAPI: /v4/sports/{sport}/odds/...
    // Some plans require /odds/?markets=...
    // We'll try and be defensive.
    let events: any[] = [];
    let lastErr: any = null;

    for (const market of candidateMarkets) {
      const url =
        `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/` +
        `?apiKey=${encodeURIComponent(apiKey)}` +
        `&regions=${regions}` +
        `&markets=${encodeURIComponent(market)}` +
        `&oddsFormat=${oddsFormat}` +
        (books ? `&bookmakers=${encodeURIComponent(books)}` : "");

      try {
        const json = await fetchOddsApiJson(url);
        if (Array.isArray(json) && json.length) {
          events = json;
          break;
        }
      } catch (e) {
        lastErr = e;
      }
    }

    if (!events.length) {
      return j({
        ok: false,
        message:
          "No player prop markets returned. This usually means your free plan/provider doesn’t include player props for NCAAB yet.",
        detail: lastErr ? String(lastErr?.message ?? lastErr) : null,
      });
    }

    // 4) transform → rows
    const fetchedAt = nowIso();
    const rows: UpsertRow[] = [];

    for (const ev of events) {
      const eventId = String(ev?.id ?? "");
      const commenceTime = ev?.commence_time ?? null;
      const homeTeam = ev?.home_team ?? null;
      const awayTeam = ev?.away_team ?? null;

      const bookmakers = Array.isArray(ev?.bookmakers) ? ev.bookmakers : [];
      for (const bk of bookmakers) {
        const bookKey = bk?.key ?? null;
        const bookTitle = bk?.title ?? null;
        const bookLastUpdate = bk?.last_update ?? null;

        const markets = Array.isArray(bk?.markets) ? bk.markets : [];
        for (const mk of markets) {
          const marketKey = String(mk?.key ?? "unknown");
          const outcomes = Array.isArray(mk?.outcomes) ? mk.outcomes : [];

          for (const o of outcomes) {
            // providers vary; try to normalize:
            const playerName =
              o?.description ?? o?.player ?? o?.name ?? o?.participant ?? null;

            // side: over/under/line
            const side =
              (o?.name || o?.label || "").toLowerCase().includes("over")
                ? "over"
                : (o?.name || o?.label || "").toLowerCase().includes("under")
                ? "under"
                : (o?.type ?? "line");

            const line =
              o?.point != null ? Number(o.point) : o?.line != null ? Number(o.line) : null;

            const price =
              o?.price != null ? Number(o.price) : o?.odds != null ? Number(o.odds) : null;

            rows.push({
              source: "oddsapi",
              sport_key: sportKey,
              event_id: eventId,
              commence_time: commenceTime,
              home_team: homeTeam,
              away_team: awayTeam,
              book_key: bookKey,
              book_title: bookTitle,
              book_last_update: bookLastUpdate,
              market: marketKey,
              side,
              player_name: playerName,
              line: Number.isFinite(line as any) ? (line as number) : null,
              price: Number.isFinite(price as any) ? (price as number) : null,
              fetched_at: fetchedAt,
              raw: { event: ev, bookmaker: bk, market: mk, outcome: o },
            });
          }
        }
      }
    }

    // 5) upsert into Supabase
    // Your unique index: (source, sport_key, event_id, market, book_key, player_name, side)
    const { error: upErr } = await supabase
      .from("sportsbook_lines")
      .upsert(rows, {
        onConflict: "source,sport_key,event_id,market,book_key,player_name,side",
        ignoreDuplicates: false,
      });

    if (upErr) throw upErr;

    return j({ ok: true, inserted: rows.length, fetchedAt });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return j({ ok: false, error: String(e?.message ?? e) }, status);
  }
}