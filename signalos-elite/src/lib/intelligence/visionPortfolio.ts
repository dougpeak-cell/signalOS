import { getCompanyProfile } from "@/lib/getCompanyProfile";
import type { PortfolioItem } from "@/lib/intelligence/buildMarketIntel";
import type { VisionOpportunity, VisionPortfolioIntelligence } from "@/lib/intelligence/visionOverview";
import type { VisionSector } from "@/lib/market/sectorComparison";
import type { ServerQuoteMap } from "@/lib/market/serverQuote";

type UpcomingEarningsRow = {
  ticker: string;
  name: string;
  dateLabel: string;
  timing: string;
};

type PortfolioHoldingRow = {
  symbol: string;
  name: string;
  sector: string;
  marketValue: number;
  weight: number;
  changePercent: number | null;
  alignment: "aligned" | "watch" | "weakening";
  earningsDateLabel: string | null;
  earningsTiming: string | null;
};

const SECTOR_ALIASES: Record<string, string> = {
  "COMMUNICATION SERVICES": "Communication",
  COMMUNICATION: "Communication",
  "CONSUMER CYCLICAL": "Consumer Discretionary",
  "CONSUMER DISCRETIONARY": "Consumer Discretionary",
  "CONSUMER DEFENSIVE": "Consumer Staples",
  "CONSUMER STAPLES": "Consumer Staples",
  ENERGY: "Energy",
  FINANCIAL: "Financials",
  FINANCIALS: "Financials",
  "FINANCIAL SERVICES": "Financials",
  HEALTHCARE: "Healthcare",
  INDUSTRIAL: "Industrials",
  INDUSTRIALS: "Industrials",
  MATERIALS: "Materials",
  "BASIC MATERIALS": "Materials",
  "REAL ESTATE": "Real Estate",
  TECHNOLOGY: "Technology",
  UTILITIES: "Utilities",
};

function normalizeTicker(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSectorName(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Unclassified";

  return SECTOR_ALIASES[normalized.toUpperCase()] ?? normalized;
}

function formatWeight(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function pluralize(word: string, count: number) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function getWeightLevel(value: number): "Low" | "Moderate" | "High" {
  if (value >= 45) return "High";
  if (value >= 28) return "Moderate";
  return "Low";
}

function getHoldingSymbol(item: PortfolioItem) {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getHoldingShares(item: PortfolioItem) {
  return getNumber(item.shares) ?? getNumber(item.quantity) ?? 0;
}

function getHoldingMarketValue(item: PortfolioItem, price: number | null) {
  const explicitMarketValue = getNumber(item.marketValue);

  if (explicitMarketValue != null && explicitMarketValue > 0) {
    return explicitMarketValue;
  }

  const shares = getHoldingShares(item);
  if (shares > 0 && price != null && price > 0) {
    return shares * price;
  }

  return 0;
}

function normalizeCalendarDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function formatCalendarDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function normalizeEarningsTiming(value: unknown) {
  if (typeof value !== "string") return "Earnings";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Earnings";
  if (normalized.includes("amc") || normalized.includes("after")) return "After close";
  if (normalized.includes("bmo") || normalized.includes("before")) return "Before open";
  return "Earnings";
}

async function fetchUpcomingPortfolioEarnings(
  tickers: string[]
): Promise<Record<string, UpcomingEarningsRow>> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey || tickers.length === 0) {
    return {};
  }

  const today = new Date();
  const fromDate = today.toISOString().slice(0, 10);
  const toDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const prioritized = new Set(tickers.map(normalizeTicker).filter(Boolean));
  const urls = [
    `https://financialmodelingprep.com/stable/earnings-calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`,
    `https://financialmodelingprep.com/api/v3/earning_calendar?from=${fromDate}&to=${toDate}&apikey=${apiKey}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        continue;
      }

      const rows = payload.reduce<Record<string, UpcomingEarningsRow>>((result, candidate) => {
        const ticker = normalizeTicker(
          (candidate as { symbol?: unknown; ticker?: unknown }).symbol ??
            (candidate as { ticker?: unknown }).ticker ??
            ""
        );

        if (!ticker || !prioritized.has(ticker) || result[ticker]) {
          return result;
        }

        const sortDate = normalizeCalendarDate(
          (candidate as { date?: unknown; publicationDate?: unknown; earningsDate?: unknown; reportedDate?: unknown }).date ??
            (candidate as { publicationDate?: unknown }).publicationDate ??
            (candidate as { earningsDate?: unknown }).earningsDate ??
            (candidate as { reportedDate?: unknown }).reportedDate ??
            null
        );

        if (!sortDate) {
          return result;
        }

        result[ticker] = {
          ticker,
          name:
            typeof (candidate as { name?: unknown; companyName?: unknown }).name === "string"
              ? String((candidate as { name: string }).name).trim()
              : typeof (candidate as { companyName?: unknown }).companyName === "string"
                ? String((candidate as { companyName: string }).companyName).trim()
                : ticker,
          dateLabel: formatCalendarDateLabel(sortDate),
          timing: normalizeEarningsTiming(
            (candidate as { time?: unknown; when?: unknown }).time ??
              (candidate as { when?: unknown }).when ??
              null
          ),
        };

        return result;
      }, {});

      if (Object.keys(rows).length > 0) {
        return rows;
      }
    } catch {
      // Try the next endpoint shape.
    }
  }

  return {};
}

export async function buildVisionPortfolioIntelligence(args: {
  portfolio: PortfolioItem[];
  quoteMap: ServerQuoteMap;
  sectors: VisionSector[];
  leader: string | null;
  improving: string[];
  weakening: string[];
  opportunities: VisionOpportunity[];
}): Promise<VisionPortfolioIntelligence> {
  const symbols = Array.from(
    new Set(args.portfolio.map(getHoldingSymbol).filter(Boolean))
  );

  if (symbols.length === 0) {
    return {
      hasPortfolio: false,
      holdingsCount: 0,
      totalValue: 0,
      topSector: null,
      topSectorWeight: 0,
      concentrationLevel: "Low",
      correlationLevel: "Low",
      sensitivityLevel: "Low",
      alignedHoldings: 0,
      weakeningHoldings: 0,
      exposureSummary: "No synced portfolio holdings are available yet.",
      concentrationSummary: "Connect a portfolio to measure sector concentration and exposure.",
      sectorAlignmentSummary: "Portfolio alignment needs holdings before Vision can compare them with market leadership.",
      riskConflictSummary: "Risk conflicts will appear after portfolio holdings are connected.",
      earningsSummary: "Upcoming earnings proximity will appear after portfolio holdings are connected.",
      correlationSummary: "Correlation analysis needs a connected portfolio.",
      sensitivitySummary: "Portfolio sensitivity needs a connected portfolio.",
      topSectors: [],
      riskConflicts: [],
      holdings: [],
    };
  }

  const [profiles, earningsMap] = await Promise.all([
    Promise.all(symbols.map(async (symbol) => [symbol, await getCompanyProfile(symbol)] as const)),
    fetchUpcomingPortfolioEarnings(symbols),
  ]);

  const profileMap = new Map(profiles);
  const sectorMoveMap = new Map(
    args.sectors.map((sector) => [normalizeSectorName(sector.sector), sector.today])
  );
  const leadingSectors = new Set([
    normalizeSectorName(args.leader),
    ...args.improving.map((sector) => normalizeSectorName(sector)),
  ].filter((sector) => sector !== "Unclassified"));
  const weakeningSectors = new Set(
    args.weakening.map((sector) => normalizeSectorName(sector)).filter(
      (sector) => sector !== "Unclassified"
    )
  );

  const rawRows = args.portfolio.reduce<PortfolioHoldingRow[]>((result, item) => {
      const symbol = getHoldingSymbol(item);
      if (!symbol) return result;

      const profile = profileMap.get(symbol);
      const price = args.quoteMap[symbol]?.price ?? getNumber(item.currentPrice) ?? getNumber(item.price);
      const marketValue = getHoldingMarketValue(item, price);
      const sector = normalizeSectorName(profile?.sector);
      const sectorToday = sectorMoveMap.get(sector) ?? null;
      const changePercent = args.quoteMap[symbol]?.changePct ?? null;
      const relativeLag =
        changePercent != null && sectorToday != null ? changePercent - sectorToday : null;

      let alignment: PortfolioHoldingRow["alignment"] = "watch";

      if (weakeningSectors.has(sector) || (relativeLag != null && relativeLag <= -2)) {
        alignment = "weakening";
      } else if (leadingSectors.has(sector) && (relativeLag == null || relativeLag >= -1.5)) {
        alignment = "aligned";
      }

      const earnings = earningsMap[symbol] ?? null;

      result.push({
        symbol,
        name: profile?.name ?? symbol,
        sector,
        marketValue,
        weight: 0,
        changePercent,
        alignment,
        earningsDateLabel: earnings?.dateLabel ?? null,
        earningsTiming: earnings?.timing ?? null,
      });

      return result;
    }, []);

  const totalValue = rawRows.reduce((sum, row) => sum + row.marketValue, 0);
  const weightedRows = rawRows.map((row) => ({
    ...row,
    weight:
      totalValue > 0
        ? (row.marketValue / totalValue) * 100
        : rawRows.length > 0
          ? 100 / rawRows.length
          : 0,
  }));

  const sectorWeights = weightedRows.reduce<Map<string, number>>((result, row) => {
    result.set(row.sector, (result.get(row.sector) ?? 0) + row.weight);
    return result;
  }, new Map());

  const topSectors = [...sectorWeights.entries()]
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3);

  const topSector = topSectors[0]?.sector ?? null;
  const topSectorWeight = topSectors[0]?.weight ?? 0;
  const topTwoWeight = topSectors.slice(0, 2).reduce((sum, row) => sum + row.weight, 0);
  const alignedHoldings = weightedRows.filter((row) => row.alignment === "aligned").length;
  const weakeningHoldings = weightedRows.filter((row) => row.alignment === "weakening").length;
  const weakeningWeight = weightedRows
    .filter((row) => row.alignment === "weakening")
    .reduce((sum, row) => sum + row.weight, 0);
  const leadingOpportunity = args.opportunities[0] ?? null;
  const leadingOpportunitySector = normalizeSectorName(leadingOpportunity?.sector);
  const concentrationLevel = getWeightLevel(topSectorWeight);
  const correlationLevel = getWeightLevel(topTwoWeight);
  const sensitivityLevel =
    args.leader && normalizeSectorName(args.leader) === topSector && topSectorWeight >= 35
      ? "High"
      : topTwoWeight >= 55 || topSectorWeight >= 28
        ? "Moderate"
        : "Low";

  const riskConflicts: string[] = [];

  if (
    leadingOpportunity &&
    topSector &&
    topSectorWeight >= 35 &&
    leadingOpportunitySector === topSector
  ) {
    riskConflicts.push(
      `Sigi sees opportunity in ${leadingOpportunitySector}, but adding ${leadingOpportunity.symbol} would increase your concentration risk.`
    );
  }

  if (weakeningWeight >= 20) {
    riskConflicts.push(
      `${formatWeight(weakeningWeight)} of tracked portfolio value is tied to holdings that are weakening against their sectors.`
    );
  }

  if (topTwoWeight >= 60) {
    riskConflicts.push(
      `The top two sectors account for ${formatWeight(topTwoWeight)} of portfolio exposure, which raises correlation risk.`
    );
  }

  const earningsRows = weightedRows
    .filter((row) => row.earningsDateLabel)
    .sort((left, right) => left.weight - right.weight)
    .reverse()
    .slice(0, 3);

  const exposureSummary = topSector
    ? `${topSector} is your largest exposure at ${formatWeight(topSectorWeight)} of tracked portfolio value.`
    : "Tracked portfolio exposures are still being classified by sector.";
  const concentrationSummary = topSector
    ? `${concentrationLevel} concentration: ${topSector} represents ${formatWeight(topSectorWeight)} of tracked exposure.`
    : "Concentration cannot be measured until holdings receive sector mapping.";
  const sectorAlignmentSummary = `${pluralize("holding", alignedHoldings)} aligned with current leadership. ${weakeningHoldings > 0 ? `${pluralize("holding", weakeningHoldings)} weakening against its sector.` : "No tracked holdings are materially lagging their sectors right now."}`;
  const riskConflictSummary =
    riskConflicts[0] ??
    (topSector && leadingOpportunity && leadingOpportunitySector !== topSector
      ? `${leadingOpportunity.symbol} adds exposure in ${leadingOpportunitySector}, which is less concentrated than your current ${topSector} bias.`
      : "No immediate portfolio-to-Vision conflict stands out right now." );
  const earningsSummary = earningsRows.length
    ? `${pluralize("holding", earningsRows.length)} report${earningsRows.length === 1 ? "s" : ""} within the next three weeks: ${earningsRows
        .map((row) => `${row.symbol} ${row.earningsDateLabel}`)
        .join(", ")}.`
    : "No near-term earnings dates were detected for tracked portfolio holdings.";
  const correlationSummary =
    correlationLevel === "High"
      ? `Correlation is elevated because your top two sectors represent ${formatWeight(topTwoWeight)} of tracked exposure.`
      : correlationLevel === "Moderate"
        ? `Correlation is moderate with ${formatWeight(topTwoWeight)} of tracked exposure concentrated in the top two sectors.`
        : "Correlation is relatively contained because exposure is spread across multiple sectors.";
  const sensitivitySummary =
    sensitivityLevel === "High" && topSector
      ? `Portfolio sensitivity is high to ${topSector} and broad risk appetite because that sector remains your dominant exposure.`
      : sensitivityLevel === "Moderate" && topSector
        ? `Portfolio sensitivity is moderate to ${topSector} leadership and sector rotation.`
        : "Portfolio sensitivity is relatively balanced across sectors right now.";

  return {
    hasPortfolio: weightedRows.length > 0,
    holdingsCount: weightedRows.length,
    totalValue,
    topSector,
    topSectorWeight,
    concentrationLevel,
    correlationLevel,
    sensitivityLevel,
    alignedHoldings,
    weakeningHoldings,
    exposureSummary,
    concentrationSummary,
    sectorAlignmentSummary,
    riskConflictSummary,
    earningsSummary,
    correlationSummary,
    sensitivitySummary,
    topSectors,
    riskConflicts,
    holdings: weightedRows
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 5)
      .map((row) => ({
        symbol: row.symbol,
        name: row.name,
        sector: row.sector,
        weight: row.weight,
        marketValue: totalValue > 0 ? row.marketValue : null,
        changePercent: row.changePercent,
        alignment: row.alignment,
        earningsDateLabel: row.earningsDateLabel,
        earningsTiming: row.earningsTiming,
      })),
  };
}