import {
  getSigiInterestDefinition,
  getSigiProfile,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";
import {
  getSigiSessionContext,
  saveSigiSessionContext,
} from "@/lib/sigi/sigiSessionContext";
import { findEducationEntry } from "@/lib/sigi/sigiEducationLookup";
import { resolveTicker } from "@/lib/sigi/resolveTicker";

export type SigiIntentType =
  | "greeting"
  | "help"
  | "education"
  | "watchlist"
  | "market"
  | "sector"
  | "stock"
  | "trade"
  | "reset"
  | "style"
  | "unknown";

export type SigiIntent = {
  type: SigiIntentType;
  ticker: string | null;
  sector: string | null;
  direction: "up" | "down" | null;
  isBest: boolean;
  showWhyNotOthers: boolean;
  educationId?: string | null;
  confidence: number;
  shouldOpenStockPage: boolean;
  quickReply: string | null;
};

const SECTOR_KEYWORDS: Record<string, string[]> = {
  Technology: ["technology", "tech", "software", "semiconductors", "chips", "ai"],
  Energy: ["energy", "oil", "gas", "solar", "uranium"],
  Healthcare: ["healthcare", "health care", "biotech", "pharma"],
  Financials: ["financials", "banks", "banking", "insurance"],
  Crypto: ["crypto", "bitcoin", "ethereum", "btc", "eth"],
  Industrials: ["industrials", "defense", "aerospace", "manufacturing"],
  "Space & Satellite": ["space", "satellite", "launch", "new space", "rocket", "orbital"],
  Consumer: ["consumer", "retail", "restaurants", "discretionary"],
};

const GREETING_PATTERNS = [
  /\bhi\b/i,
  /\bhello\b/i,
  /\bhey\b/i,
  /\bgood morning\b/i,
  /\bgood afternoon\b/i,
  /\bgood evening\b/i,
  /\bhow are you\b/i,
];

const HELP_PATTERNS = [
  /\bhelp\b/i,
  /\bwhat can you do\b/i,
  /\bwho are you\b/i,
  /\bhow do i use\b/i,
];

const EDUCATION_PATTERNS = [
  /\bwhat is\b/i,
  /\bexplain\b/i,
  /\bdefine\b/i,
  /\bwhat does .* mean\b/i,
  /\bmeaning of\b/i,
];

const WATCHLIST_PATTERNS = [
  /\bwhat should i watch\b/i,
  /\bwatchlist\b/i,
  /\bwhat stock should i buy today\b/i,
  /\bwhat stocks should i buy today\b/i,
  /\bwhat should i buy today\b/i,
  /\bwhat should i buy\b/i,
  /\bwhich stock should i buy\b/i,
  /\bwhich stocks should i buy\b/i,
  /\bbest stock to buy\b/i,
  /\bbest stocks to buy\b/i,
  /\bbuy idea\b/i,
  /\bbuy ideas\b/i,
  /\bwhat is the best stock today\b/i,
  /\bwhat's the best stock today\b/i,
  /\bwhat is the best play today\b/i,
  /\bwhat's the best play today\b/i,
  /\bbest stock today\b/i,
  /\bbest setup today\b/i,
  /\bbest play today\b/i,
  /\btop stock today\b/i,
  /\btop setup today\b/i,
  /\btop play today\b/i,
  /\bnumber one stock today\b/i,
  /\bstocks to watch\b/i,
  /\bwhat stocks should i focus on\b/i,
  /\btop stocks for me\b/i,
  /\bbased on my profile\b/i,
  /\bwhat stock is going up\b/i,
  /\bwhat stocks are going up\b/i,
  /\bwhat is going up\b/i,
  /\bstocks going up\b/i,
  /\bwhat has momentum\b/i,
  /\bwhere is momentum\b/i,
  /\bshow momentum\b/i,
  /\bshow momentum stocks\b/i,
  /\bmomentum stocks\b/i,
  /\bwhat stock is going down\b/i,
  /\bwhat stocks are going down\b/i,
  /\bwhat is going down\b/i,
  /\bstocks going down\b/i,
  /\bwhat stock is bullish\b/i,
  /\bwhat stocks are bullish\b/i,
  /\bwhich stock is bullish\b/i,
  /\bwhich stocks are bullish\b/i,
  /\bbullish stock\b/i,
  /\bbullish stocks\b/i,
  /\bbearish stocks\b/i,
  /\bwhat stock is not doing well\b/i,
  /\bwhat stock is down\b/i,
  /\bwhat stocks are down\b/i,
  /\bwhat stock is falling\b/i,
  /\bwhat stocks are falling\b/i,
  /\bwhat stock is weak\b/i,
  /\bwhat stocks are weak\b/i,
  /\bwhat is weak\b/i,
  /\bwhat's weak\b/i,
  /\bwhat dip should i buy\b/i,
  /\bwhich dip should i buy\b/i,
  /\bwhat stock is underperforming\b/i,
  /\bwhat stocks are underperforming\b/i,
  /\bwhat is the worst stock today\b/i,
  /\bwhat stocks look bad today\b/i,
  /\bwhat should i avoid today\b/i,
  /\bshow bullish names\b/i,
  /\bshow bullish stocks\b/i,
  /\bshow weak stocks\b/i,
  /\bshow bearish setups\b/i,
];

const BEARISH_MARKET_PATTERNS = [
  /\bwhat stock is not doing well\b/i,
  /\bwhat stock is down\b/i,
  /\bwhat stocks are down\b/i,
  /\bwhat stock is falling\b/i,
  /\bwhat stocks are falling\b/i,
  /\bwhat stock is weak\b/i,
  /\bwhat stocks are weak\b/i,
  /\bwhat is weak\b/i,
  /\bwhat's weak\b/i,
  /\bwhat dip should i buy\b/i,
  /\bwhich dip should i buy\b/i,
  /\bwhat stock is underperforming\b/i,
  /\bwhat stocks are underperforming\b/i,
  /\bwhat is the worst stock today\b/i,
  /\bwhat stocks look bad today\b/i,
  /\bwhat should i avoid today\b/i,
  /\bshow weak stocks\b/i,
  /\bshow bearish setups\b/i,
];

const MARKET_PATTERNS = [
  /\bmarket\b/i,
  /\bspy\b/i,
  /\bqqq\b/i,
  /\brisk[- ]?on\b/i,
  /\brisk[- ]?off\b/i,
  /\bwhat matters\b/i,
  /\bwatch today\b/i,
];

const TRADE_PATTERNS = [
  /\btrade setup\b/i,
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\bsetup\b/i,
  /\bentry\b/i,
  /\bexit\b/i,
  /\btarget\b/i,
  /\bstop\b/i,
  /\bstop loss\b/i,
  /\brisk\b/i,
  /\bbreakout\b/i,
  /\bbreakdown\b/i,
  /\blong\b/i,
  /\bshort\b/i,
  /\bwhere should i buy\b/i,
  /\bis .* a buy\b/i,
];

const RESET_PATTERNS = [
  /\breset\b/i,
  /\bstart over\b/i,
  /\bclear profile\b/i,
];

const STYLE_PATTERNS = [
  /\bexplain simply\b/i,
  /\bsimple version\b/i,
  /\bgo faster\b/i,
  /\bfast read\b/i,
  /\bmore detail\b/i,
  /\bexplain more\b/i,
];

const WHY_NOT_PATTERNS = [
  /\bwhy not the others\b/i,
  /\bwhy not .*others\b/i,
  /\bwhy is .* ranked lower\b/i,
  /\bwhy did .* rank lower\b/i,
  /\bcompare the picks\b/i,
  /\bcompare these stocks\b/i,
  /\bwhy this one\b/i,
];

function getName(profile: SigiProfile | null) {
  return profile?.name?.trim() || "friend";
}

function findSector(message: string) {
  const lower = message.toLowerCase();

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some((word) => lower.includes(word))) {
      return sector;
    }
  }

  return null;
}

function matchesAny(message: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(message));
}

function detectDirection(message: string): "up" | "down" | null {
  const lower = message.toLowerCase();

  if (matchesAny(message, BEARISH_MARKET_PATTERNS)) return "down";
  if (lower.includes("up") || lower.includes("bullish")) return "up";
  if (
    lower.includes("down") ||
    lower.includes("bearish") ||
    lower.includes("weak") ||
    lower.includes("dip") ||
    lower.includes("falling") ||
    lower.includes("underperforming") ||
    lower.includes("avoid") ||
    lower.includes("worst")
  ) {
    return "down";
  }

  return null;
}

function detectBest(message: string): boolean {
  const lower = message.toLowerCase();

  return (
    lower.includes("best") ||
    lower.includes("top") ||
    lower.includes("number one") ||
    lower.includes("should i buy")
  );
}

function detectWhyNotOthers(message: string) {
  return matchesAny(message, WHY_NOT_PATTERNS);
}

function getSectorThemeMatches(sector: string, profile: SigiProfile | null) {
  const interests = profile?.interests ?? [];

  return interests
    .map((interest) => getSigiInterestDefinition(interest))
    .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition))
    .filter((definition) => {
      if (definition.label === sector) return true;

      return (definition.primarySectors ?? []).some(
        (primarySector) => primarySector.toLowerCase() === sector.toLowerCase()
      );
    });
}

function buildQuickReply({
  type,
  ticker,
  sector,
  profile,
}: {
  type: SigiIntentType;
  ticker: string | null;
  sector: string | null;
  profile: SigiProfile | null;
}) {
  const name = getName(profile);

  if (type === "greeting") {
    return `Doing great, ${name}. What stock would you like to analyze?`;
  }

  if (type === "help") {
    return `I can analyze stocks, sectors, signals, risk, catalysts, and trade setups. Give me a ticker or ask about a sector, ${name}.`;
  }

  if (type === "sector" && sector) {
    if (sector === "Space & Satellite") {
      return `${name}, Space & Satellite is a live theme here. I’ll treat it as an Industrials/Technology lane and explicitly watch space, satellite, and launch names. What ticker in that theme should I analyze?`;
    }

    const matchingThemes = getSectorThemeMatches(sector, profile).filter(
      (definition) => (definition.themeTags ?? []).length > 0
    );

    if (matchingThemes.length > 0) {
      const theme = matchingThemes[0];
      const themeTags = (theme.themeTags ?? []).map((tag) => tag.toLowerCase()).join(", ");

      return `${sector} is the area to analyze. Your ${theme.label} theme sits in this lane, so I’ll explicitly watch ${themeTags} names along with sector leadership, weakness, and risk. What stock in ${sector} would you like to look at?`;
    }

    return `${sector} is the area to analyze. I can check strength, weakness, leadership, and risk. What stock in ${sector} would you like to look at?`;
  }

  if (type === "market") {
    return `Market read: focus on structure, leadership, risk mode, and follow-through. What stock should I analyze next?`;
  }

  if (type === "style") {
    return `Got it, ${name}. I’ll adjust the answer style for this read.`;
  }

  if (type === "reset") {
    return `Profile reset requested. You can start fresh with SIGI.`;
  }

  if (type === "stock" && ticker) {
    return `${name}, here’s what matters for ${ticker}:`;
  }

  if (type === "trade" && ticker) {
    return `${name}, I’ll look at ${ticker} through setup, risk, target, and confirmation.`;
  }

  if (type === "trade") {
    return `Give me a ticker and I’ll break down setup, entry risk, target, and confirmation.`;
  }

  return null;
}

export function matchSigiIntent(message: string): SigiIntent {
  const profile = getSigiProfile();
  const clean = message.trim();

  if (!clean) {
    return {
      type: "unknown",
      ticker: null,
      sector: null,
      direction: null,
      isBest: false,
      showWhyNotOthers: false,
      educationId: null,
      confidence: 0,
      shouldOpenStockPage: false,
      quickReply: null,
    };
  }

  const ticker = resolveTicker(clean);
  const sector = findSector(clean);
  const direction = detectDirection(clean);
  const isBest = detectBest(clean);
  const showWhyNotOthers = detectWhyNotOthers(clean);
  const educationEntry = findEducationEntry(clean);

  let type: SigiIntentType = "unknown";
  let confidence = 0.3;

  if (matchesAny(clean, RESET_PATTERNS)) {
    type = "reset";
    confidence = 0.95;
  } else if (matchesAny(clean, STYLE_PATTERNS)) {
    type = "style";
    confidence = 0.9;
  } else if (educationEntry && matchesAny(clean, EDUCATION_PATTERNS)) {
    type = "education";
    confidence = 0.95;
  } else if (ticker && matchesAny(clean, TRADE_PATTERNS)) {
    type = "trade";
    confidence = 0.95;
  } else if (sector) {
    type = "sector";
    confidence = 0.85;
  } else if (ticker) {
    type = "stock";
    confidence = 0.9;
  } else if (matchesAny(clean, WATCHLIST_PATTERNS)) {
    type = "watchlist";
    confidence = 0.9;
  } else if (matchesAny(clean, MARKET_PATTERNS)) {
    type = "market";
    confidence = 0.8;
  } else if (matchesAny(clean, HELP_PATTERNS)) {
    type = "help";
    confidence = 0.8;
  } else if (matchesAny(clean, GREETING_PATTERNS)) {
    type = "greeting";
    confidence = 0.75;
  }

  const wantsNavigation =
    /\b(open|go to|show page|stock page|chart|live chart|workspace)\b/i.test(clean);

  return {
    type,
    ticker,
    sector,
    direction,
    isBest,
    showWhyNotOthers,
    educationId: educationEntry?.id ?? null,
    confidence,
    shouldOpenStockPage: Boolean(ticker && wantsNavigation),
    quickReply: buildQuickReply({
      type,
      ticker,
      sector,
      profile,
    }),
  };
}

export function matchSigiIntentWithContext(message: string): SigiIntent {
  const context = getSigiSessionContext();
  const intent = matchSigiIntent(message);

  const followUpNeedsTicker =
    ["trade", "stock"].includes(intent.type) ||
    /\b(risk|entry|target|setup|breakout|breakdown|support|resistance|chart|trend)\b/i.test(
      message
    );

  const ticker = intent.ticker || (followUpNeedsTicker ? context.lastTicker : null);
  const sector = intent.sector || context.lastSector;

  const nextIntent: SigiIntent = {
    ...intent,
    ticker,
    sector,
    shouldOpenStockPage: intent.shouldOpenStockPage,
  };

  saveSigiSessionContext({
    lastTicker: ticker,
    lastSector: sector,
    lastIntent: nextIntent.type,
    lastMessage: message,
  });

  return nextIntent;
}
