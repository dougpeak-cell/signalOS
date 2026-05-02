import {
  getSigiInterestDefinition,
  type SigiProfile,
} from "@/lib/sigi/sigiProfile";

type ThemeLeader = {
  ticker: string;
  name: string;
  note: string;
  tags?: Array<"space" | "satellite" | "launch">;
  sortPriority?: number;
};

type ThemeLeaderQuote = {
  ticker: string;
  price?: number | null;
  changePercent?: number | null;
  rvol?: number | null;
};

const SPACE_THEME_LEADERS: ThemeLeader[] = [
  {
    ticker: "RKLB",
    name: "Rocket Lab",
    note: "pure-play leader across launch and space systems",
    tags: ["space", "satellite", "launch"],
    sortPriority: 100,
  },
  {
    ticker: "PL",
    name: "Planet Labs",
    note: "satellite imaging and data-platform leader",
    tags: ["space", "satellite"],
    sortPriority: 90,
  },
  {
    ticker: "SIDU",
    name: "Sidus Space",
    note: "smaller-cap satellite and mission beta",
    tags: ["space", "satellite", "launch"],
    sortPriority: 70,
  },
  {
    ticker: "GE",
    name: "GE Aerospace",
    note: "large-cap aerospace quality name tied to the same lane",
    tags: ["space", "launch"],
    sortPriority: 65,
  },
  {
    ticker: "ASTS",
    name: "AST SpaceMobile",
    note: "high-beta space infrastructure and direct-to-device satellite name",
    tags: ["space", "satellite", "launch"],
    sortPriority: 85,
  },
];

function getMatchingTheme(sector?: string | null, profile?: SigiProfile | null) {
  const normalizedSector = sector?.trim().toLowerCase() ?? "";

  return (profile?.interests ?? [])
    .map((interest) => getSigiInterestDefinition(interest))
    .find((definition) => {
      if (!definition) return false;
      if (definition.label.trim().toLowerCase() === normalizedSector) return true;

      return (definition.primarySectors ?? []).some(
        (primarySector) => primarySector.trim().toLowerCase() === normalizedSector
      );
    });
}

function formatThemeLeadersReply({
  intro,
  leaders,
}: {
  intro: string;
  leaders: ThemeLeader[];
}) {
  return `${intro}

${leaders
    .map((leader, index) => `${index + 1}. ${leader.ticker} - ${leader.name}: ${leader.note}`)
    .join("\n")}

Click any ticker to open the live chart.`;
}

async function fetchThemeLeaderQuotes(tickers: string[]): Promise<Record<string, ThemeLeaderQuote>> {
  if (!tickers.length) return {};

  try {
    const response = await fetch(
      `/api/quotes?tickers=${encodeURIComponent(tickers.join(","))}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) return {};

    const json = (await response.json()) as {
      quotes?: Array<{
        ticker: string;
        price?: number | null;
        currentPrice?: number | null;
        changePercent?: number | null;
        changePct?: number | null;
        rvol?: number | null;
      }>;
    };

    const quotes = Array.isArray(json.quotes) ? json.quotes : [];

    return quotes.reduce<Record<string, ThemeLeaderQuote>>((map, item) => {
      const ticker = item.ticker?.trim().toUpperCase();
      if (!ticker) return map;

      map[ticker] = {
        ticker,
        price: item.price ?? item.currentPrice ?? null,
        changePercent: item.changePercent ?? item.changePct ?? null,
        rvol: item.rvol ?? null,
      };
      return map;
    }, {});
  } catch {
    return {};
  }
}

function filterSpaceLeaders(question: string) {
  const lower = question.trim().toLowerCase();

  if (lower.includes("launch")) {
    return {
      intro: "Here are the launch names I would open first in the Space & Satellite lane:",
      leaders: SPACE_THEME_LEADERS.filter((leader) => leader.tags?.includes("launch")),
    };
  }

  if (lower.includes("satellite")) {
    return {
      intro: "These are the satellite names I would keep at the top of the board right now:",
      leaders: SPACE_THEME_LEADERS.filter((leader) => leader.tags?.includes("satellite")),
    };
  }

  if (lower.includes("momentum") || lower.includes("best setup") || lower.includes("setup")) {
    return {
      intro: "These are the Space & Satellite names I would check first for momentum and best setups:",
      leaders: SPACE_THEME_LEADERS.filter((leader) => leader.tags?.includes("space")),
    };
  }

  return {
    intro: "These are the Space & Satellite leaders I would open first:",
    leaders: SPACE_THEME_LEADERS.filter((leader) => leader.tags?.includes("space")),
  };
}

function formatLeaderNote(leader: ThemeLeader, quote?: ThemeLeaderQuote) {
  const metricParts: string[] = [];

  if (typeof quote?.changePercent === "number" && Number.isFinite(quote.changePercent)) {
    metricParts.push(`${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`);
  }

  if (typeof quote?.rvol === "number" && Number.isFinite(quote.rvol) && quote.rvol > 0) {
    metricParts.push(`RVOL ${quote.rvol.toFixed(1)}x`);
  }

  return metricParts.length > 0
    ? `${leader.note} • ${metricParts.join(" • ")}`
    : leader.note;
}

function calculateThemeLeaderScore(quote?: ThemeLeaderQuote) {
  if (!quote) return null;

  const changePercent =
    typeof quote.changePercent === "number" && Number.isFinite(quote.changePercent)
      ? quote.changePercent
      : 0;
  const rvol =
    typeof quote.rvol === "number" && Number.isFinite(quote.rvol) && quote.rvol > 0
      ? quote.rvol
      : 1;

  // Theme lists should favor active relative volume before raw price extension.
  return rvol * 140 + changePercent * 4;
}

export async function buildSigiSectorLeadersReply({
  question,
  sector,
  profile,
}: {
  question: string;
  sector?: string | null;
  profile?: SigiProfile | null;
}) {
  const lower = question.trim().toLowerCase();
  const matchingTheme = getMatchingTheme(sector, profile);
  const isSpaceTheme =
    sector?.trim().toLowerCase() === "space & satellite" ||
    matchingTheme?.label === "Space & Satellite";

  if (!isSpaceTheme) return null;

  const { intro, leaders } = filterSpaceLeaders(lower);
  const quotes = await fetchThemeLeaderQuotes(leaders.map((leader) => leader.ticker));

  const rankedLeaders = [...leaders]
    .map((leader) => {
      const quote = quotes[leader.ticker];
      const liveScore = calculateThemeLeaderScore(quote);
      const hasLiveSignal = liveScore != null;

      return {
        ...leader,
        note: formatLeaderNote(leader, quote),
        rankingScore: hasLiveSignal ? liveScore : (leader.sortPriority ?? 0),
        fallbackPriority: leader.sortPriority ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.rankingScore !== left.rankingScore) {
        return right.rankingScore - left.rankingScore;
      }

      return right.fallbackPriority - left.fallbackPriority;
    })
    .slice(0, 4)
    .map(({ rankingScore: _rankingScore, fallbackPriority: _fallbackPriority, ...leader }) => leader);

  return formatThemeLeadersReply({
    intro,
    leaders: rankedLeaders,
  });
}

function getSectorFollowUps(sector?: string | null, profile?: SigiProfile | null) {
  const normalizedSector = sector?.trim().toLowerCase() ?? "";
  const matchingTheme = getMatchingTheme(sector, profile);

  if (
    normalizedSector === "space & satellite" ||
    matchingTheme?.label === "Space & Satellite"
  ) {
    return [
      "Show me space leaders",
      "Which satellite names have momentum?",
      "Show launch names with best setups",
    ];
  }

  return [
    "Show strongest stocks in this sector",
    "Where is momentum?",
    "Find best setups",
  ];
}

export function getSigiFollowUps(
  intent: string,
  ticker?: string | null,
  options?: {
    sector?: string | null;
    profile?: SigiProfile | null;
  }
) {
  if (intent === "trade" && ticker) {
    return [
      `Show entry levels for ${ticker}`,
      `What is the risk on ${ticker}?`,
      `Show target zones for ${ticker}`,
    ];
  }

  if (intent === "stock" && ticker) {
    return [
      `Give me a trade setup for ${ticker}`,
      `Is ${ticker} breaking out?`,
      `What matters most for ${ticker}?`,
    ];
  }

  if (intent === "sector") {
    return getSectorFollowUps(options?.sector, options?.profile);
  }

  if (intent === "market") {
    return [
      "What stock should I focus on?",
      "Show top setups",
      "Where is money flowing?",
    ];
  }

  return [
    "Analyze NVDA",
    "What matters today?",
    "Show best setups",
  ];
}
