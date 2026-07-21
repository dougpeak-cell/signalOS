import { getCompanyProfile } from "@/lib/getCompanyProfile";
import type { PortfolioItem } from "@/lib/intelligence/buildMarketIntel";
import type { VisionOpportunity, VisionPortfolioIntelligence } from "@/lib/intelligence/visionOverview";
import {
  normalizeSector,
  resolveSector,
  type NormalizedSector,
} from "@/lib/market/resolve-sector";
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
  sector: NormalizedSector;
  marketValue: number;
  weight: number;
  changePercent: number | null;
  alignment: "aligned" | "watch" | "weakening";
  earningsDateLabel: string | null;
  earningsTiming: string | null;
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

function formatWeight(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function pluralize(word: string, count: number) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function countWord(count: number) {
  const labels = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return labels[count] ?? String(count);
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
      classifiedHoldingsCount: 0,
      classificationCoverage: 0,
      sectorAnalysisAvailable: false,
      totalValue: 0,
      topSector: null,
      topSectorWeight: 0,
      concentrationLevel: "Low",
      correlationLevel: "Low",
      sensitivityLevel: "Low",
      alignedHoldings: 0,
      weakeningHoldings: 0,
      nearbyEarningsCount: 0,
      exposureSummary: "No synced portfolio holdings are available yet.",
      concentrationSummary: "Connect a portfolio to measure sector concentration and exposure.",
      sectorAlignmentSummary: "Portfolio alignment needs holdings before Vision can compare them with market leadership.",
      riskConflictSummary: "Risk conflicts will appear after portfolio holdings are connected.",
      earningsSummary: "Upcoming earnings proximity will appear after portfolio holdings are connected.",
      correlationSummary: "Correlation analysis needs a connected portfolio.",
      sensitivitySummary: "Portfolio sensitivity needs a connected portfolio.",
      sectorExposure: [],
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
    args.sectors.map((sector) => [normalizeSector(sector.sector), sector.today] as const)
  );
  const leadingSectors = new Set<NormalizedSector>(
    [normalizeSector(args.leader), ...args.improving.map((sector) => normalizeSector(sector))].filter(
      (sector): sector is Exclude<NormalizedSector, "Unclassified"> => sector !== "Unclassified"
    )
  );
  const weakeningSectors = new Set<NormalizedSector>(
    args.weakening.map((sector) => normalizeSector(sector)).filter(
      (sector): sector is Exclude<NormalizedSector, "Unclassified"> => sector !== "Unclassified"
    )
  );

  const classifiedHoldings = args.portfolio.map((item) => {
    const symbol = getHoldingSymbol(item);
    const profile = symbol ? profileMap.get(symbol) : null;

    return {
      item,
      symbol,
      profile,
      sector: resolveSector({
        symbol,
        sector: profile?.sector ?? item.sector ?? null,
      }),
    };
  });

  const rawRows = classifiedHoldings.reduce<PortfolioHoldingRow[]>((result, holding) => {
      const { item, symbol, profile, sector } = holding;
      if (!symbol) return result;

      const price = args.quoteMap[symbol]?.price ?? getNumber(item.currentPrice) ?? getNumber(item.price);
      const marketValue = getHoldingMarketValue(item, price);
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
        name: profile?.name ?? item.name ?? symbol,
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

  const classifiedCount = rawRows.filter((row) => row.sector !== "Unclassified").length;
  const classificationCoverage = rawRows.length > 0 ? classifiedCount / rawRows.length : 0;
  const sectorAnalysisAvailable = classificationCoverage >= 0.8;

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
  const sectorExposure = [...sectorWeights.entries()]
    .filter(([sector]) => sector !== "Unclassified")
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((left, right) => right.weight - left.weight);

  const topSector = sectorAnalysisAvailable ? topSectors[0]?.sector ?? null : null;
  const topSectorWeight = sectorAnalysisAvailable ? topSectors[0]?.weight ?? 0 : 0;
  const topTwoWeight = sectorAnalysisAvailable
    ? topSectors.slice(0, 2).reduce((sum, row) => sum + row.weight, 0)
    : 0;
  const alignedHoldings = sectorAnalysisAvailable
    ? weightedRows.filter((row) => row.alignment === "aligned").length
    : 0;
  const weakeningHoldings = sectorAnalysisAvailable
    ? weightedRows.filter((row) => row.alignment === "weakening").length
    : 0;
  const weakeningWeight = sectorAnalysisAvailable
    ? weightedRows
        .filter((row) => row.alignment === "weakening")
        .reduce((sum, row) => sum + row.weight, 0)
    : 0;
  const leadingOpportunity = args.opportunities[0] ?? null;
  const leadingOpportunitySector = resolveSector({
    symbol: leadingOpportunity?.symbol ?? "",
    sector: leadingOpportunity?.sector ?? null,
  });
  const concentrationLevel = getWeightLevel(topSectorWeight);
  const correlationLevel = getWeightLevel(topTwoWeight);
  const sensitivityLevel =
    args.leader && normalizeSector(args.leader) === topSector && topSectorWeight >= 35
      ? "High"
      : topTwoWeight >= 55 || topSectorWeight >= 28
        ? "Moderate"
        : "Low";

  const riskConflicts: string[] = [];

  if (
    sectorAnalysisAvailable &&
    leadingOpportunity &&
    topSector &&
    topSectorWeight >= 35 &&
    leadingOpportunitySector === topSector
  ) {
    riskConflicts.push(
      `Sigi sees opportunity in ${leadingOpportunitySector}, but adding ${leadingOpportunity.symbol} would increase your concentration risk.`
    );
  }

  if (sectorAnalysisAvailable && weakeningWeight >= 20) {
    riskConflicts.push(
      `${formatWeight(weakeningWeight)} of tracked portfolio value is tied to holdings that are weakening against their sectors.`
    );
  }

  if (sectorAnalysisAvailable && topTwoWeight >= 60) {
    riskConflicts.push(
      `The top two sectors account for ${formatWeight(topTwoWeight)} of portfolio exposure, which raises correlation risk.`
    );
  }

  const earningsRows = weightedRows
    .filter((row) => row.earningsDateLabel)
    .sort((left, right) => left.weight - right.weight)
    .reverse()
    .slice(0, 3);
  const nearbyEarningsCount = weightedRows.filter((row) => row.earningsDateLabel).length;

  const coveragePercent = Math.round(classificationCoverage * 100);
  const coverageSummary = `Vision classified ${coveragePercent}% of tracked holdings. At least 80% is required before sector alignment and concentration conclusions are displayed.`;
  const secondarySector = sectorAnalysisAvailable ? topSectors[1]?.sector ?? null : null;
  const exposureSummary = sectorAnalysisAvailable && topSector
    ? `${topSector} is your largest exposure at ${formatWeight(topSectorWeight)} of tracked portfolio value.`
    : coverageSummary;
  const concentrationSummary = sectorAnalysisAvailable && topSector
    ? secondarySector
      ? `${topSector} and ${secondarySector} represent ${formatWeight(topTwoWeight)} of tracked exposure.`
      : `${topSector} represents ${formatWeight(topSectorWeight)} of tracked exposure.`
    : coverageSummary;
  const sectorAlignmentSummary = sectorAnalysisAvailable
    ? `${countWord(alignedHoldings).charAt(0).toUpperCase()}${countWord(alignedHoldings).slice(1)} holdings are positioned in sectors currently showing positive leadership.${weakeningHoldings > 0 ? ` ${countWord(weakeningHoldings).charAt(0).toUpperCase()}${countWord(weakeningHoldings).slice(1)} holdings are weakening against their sector backdrop.` : ""}`
    : coverageSummary;
  if (sectorAnalysisAvailable && topSectorWeight >= 30 && topSector) {
    riskConflicts.push(`${topSector} concentration could increase volatility.`);
  }

  if (nearbyEarningsCount >= 2) {
    riskConflicts.push(`${nearbyEarningsCount} nearby earnings events could increase volatility.`);
  }

  const riskConflictSummary = sectorAnalysisAvailable
    ? riskConflicts.length >= 2
      ? `${riskConflicts[0].replace(/\.$/, "")} and ${riskConflicts[1].charAt(0).toLowerCase()}${riskConflicts[1].slice(1)}`
      : riskConflicts[0] ??
        (topSector && leadingOpportunity && leadingOpportunitySector !== topSector
          ? `${leadingOpportunity.symbol} adds exposure in ${leadingOpportunitySector}, which is less concentrated than your current ${topSector} bias.`
          : "No immediate portfolio-to-Vision conflict stands out right now.")
    : coverageSummary;
  const earningsSummary = earningsRows.length
    ? `${pluralize("holding", earningsRows.length)} report${earningsRows.length === 1 ? "s" : ""} within the next three weeks: ${earningsRows
        .map((row) => `${row.symbol} ${row.earningsDateLabel}`)
        .join(", ")}.`
    : "No near-term earnings dates were detected for tracked portfolio holdings.";
  const correlationSummary =
    !sectorAnalysisAvailable
      ? coverageSummary
      : correlationLevel === "High"
      ? `Correlation is elevated because your top two sectors represent ${formatWeight(topTwoWeight)} of tracked exposure.`
      : correlationLevel === "Moderate"
        ? `Correlation is moderate with ${formatWeight(topTwoWeight)} of tracked exposure concentrated in the top two sectors.`
        : "Correlation is relatively contained because exposure is spread across multiple sectors.";
  const sensitivitySummary =
    !sectorAnalysisAvailable
      ? coverageSummary
      : sensitivityLevel === "High" && topSector
      ? `Portfolio sensitivity is high to ${topSector} and broad risk appetite because that sector remains your dominant exposure.`
      : sensitivityLevel === "Moderate" && topSector
        ? `Portfolio sensitivity is moderate to ${topSector} leadership and sector rotation.`
        : "Portfolio sensitivity is relatively balanced across sectors right now.";

  return {
    hasPortfolio: weightedRows.length > 0,
    holdingsCount: weightedRows.length,
    classifiedHoldingsCount: classifiedCount,
    classificationCoverage,
    sectorAnalysisAvailable,
    totalValue,
    topSector,
    topSectorWeight,
    concentrationLevel,
    correlationLevel,
    sensitivityLevel,
    alignedHoldings,
    weakeningHoldings,
    nearbyEarningsCount,
    exposureSummary,
    concentrationSummary,
    sectorAlignmentSummary,
    riskConflictSummary,
    earningsSummary,
    correlationSummary,
    sensitivitySummary,
    sectorExposure: sectorAnalysisAvailable ? sectorExposure : [],
    topSectors: sectorAnalysisAvailable ? topSectors : [],
    riskConflicts: sectorAnalysisAvailable ? riskConflicts : [],
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