type RankedPulse = {
  symbol: string;
  pulseScore?: number | null;
  opportunityScore?: number | null;
  featuredScore: number;
  rank: number;
};

type FeaturedPulseRankingProps = {
  stocks: RankedPulse[];
  activeSymbol?: string | null;
  onSelect: (symbol: string) => void;
};

export function FeaturedPulseRanking({
  stocks,
  activeSymbol,
  onSelect,
}: FeaturedPulseRankingProps) {
  if (!stocks.length) return null;

  return (
    <section className="featured-ranking">
      <div className="featured-ranking__header">
        <div>
          <span>Pulse Leadership</span>
          <h3>Today&apos;s Top Qualified Stocks</h3>
        </div>

        <p>Ranked by Sigi conviction, not price movement alone.</p>
      </div>

      <div className="featured-ranking__list">
        {stocks.map((stock) => {
          const isActive = activeSymbol === stock.symbol;

          return (
            <button
              key={stock.symbol}
              type="button"
              className={isActive ? "is-active" : undefined}
              onClick={() => onSelect(stock.symbol)}
            >
              <span className="featured-ranking__rank">#{stock.rank}</span>

              <strong>{stock.symbol}</strong>

              <span>
                Pulse{" "}
                {Number.isFinite(stock.pulseScore)
                  ? Math.round(Number(stock.pulseScore))
                  : "—"}
              </span>

              <span>
                Opportunity{" "}
                {Number.isFinite(stock.opportunityScore)
                  ? Math.round(Number(stock.opportunityScore))
                  : "—"}
              </span>

              <span className="featured-ranking__conviction">
                {Math.round(stock.featuredScore)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}