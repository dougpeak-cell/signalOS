import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PortfolioItem, WatchlistItem } from "@/lib/intelligence/buildMarketIntel";

type StoredMarketContextRow = {
  user_id: string;
  watchlist: WatchlistItem[] | null;
  portfolio: PortfolioItem[] | null;
  updated_at?: string | null;
};

type StoredMarketContext = {
  userId: string | null;
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
  updatedAt: string | null;
};

type PersistStoredMarketContextResult = {
  ok: boolean;
  userId: string | null;
  usedDevStore: boolean;
};

const DEV_CONTEXT_STORE_PATH = path.join(
  process.cwd(),
  ".next",
  "dev-market-context.json"
);

function isDevFallbackEnabled() {
  return process.env.NODE_ENV !== "production";
}

async function readDevStoredMarketContext(): Promise<StoredMarketContext> {
  if (!isDevFallbackEnabled()) {
    return {
      userId: null,
      watchlist: [],
      portfolio: [],
      updatedAt: null,
    };
  }

  try {
    const raw = await readFile(DEV_CONTEXT_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      watchlist?: unknown;
      portfolio?: unknown;
      updatedAt?: unknown;
    };

    return {
      userId: null,
      watchlist: ensureWatchlistItems(parsed.watchlist),
      portfolio: ensurePortfolioItems(parsed.portfolio),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return {
      userId: null,
      watchlist: [],
      portfolio: [],
      updatedAt: null,
    };
  }
}

async function writeDevStoredMarketContext(args: {
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
}): Promise<boolean> {
  if (!isDevFallbackEnabled()) return false;

  try {
    await mkdir(path.dirname(DEV_CONTEXT_STORE_PATH), { recursive: true });
    await writeFile(
      DEV_CONTEXT_STORE_PATH,
      JSON.stringify(
        {
          watchlist: args.watchlist,
          portfolio: args.portfolio,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
    return true;
  } catch {
    return false;
  }
}

function ensureWatchlistItems(value: unknown): WatchlistItem[] {
  return Array.isArray(value) ? (value as WatchlistItem[]) : [];
}

function ensurePortfolioItems(value: unknown): PortfolioItem[] {
  return Array.isArray(value) ? (value as PortfolioItem[]) : [];
}

export async function getStoredMarketContext(): Promise<StoredMarketContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return readDevStoredMarketContext();
  }

  const { data, error } = await supabase
    .from("user_market_contexts")
    .select("user_id, watchlist, portfolio, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load shared market context", error);
    return {
      userId: user.id,
      watchlist: [],
      portfolio: [],
      updatedAt: null,
    };
  }

  const row = (data as StoredMarketContextRow | null) ?? null;

  return {
    userId: user.id,
    watchlist: ensureWatchlistItems(row?.watchlist),
    portfolio: ensurePortfolioItems(row?.portfolio),
    updatedAt: row?.updated_at ?? null,
  };
}

export async function upsertStoredMarketContext(args: {
  watchlist: WatchlistItem[];
  portfolio: PortfolioItem[];
}): Promise<PersistStoredMarketContextResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const ok = await writeDevStoredMarketContext(args);
    return { ok, userId: null, usedDevStore: ok };
  }

  const { error } = await supabase.from("user_market_contexts").upsert(
    {
      user_id: user.id,
      watchlist: args.watchlist,
      portfolio: args.portfolio,
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    console.error("Failed to upsert shared market context", error);
    return { ok: false, userId: user.id, usedDevStore: false };
  }

  return { ok: true, userId: user.id, usedDevStore: false };
}